/** @jsxImportSource https://esm.sh/react@18.2.0 */
import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
  } from "https://esm.sh/react@18.2.0";
  import { type Memory } from "../../shared/types.ts";
  import { ASSETS, SCENE_POSITIONS, SOURCE_TYPES } from "./assets.ts";
  import { NotebookView } from "./NotebookView.tsx";
  
  const API_BASE = "/api/memories";
  const MEMORIES_PER_PAGE = 20; // Increased from 7 to 20 memories per page
  
  // Format date in natural way: "Wed, April 12"
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
  
    // Parse the date parts manually to avoid timezone issues
    const [year, month, day] = dateStr.split("-").map((num) => parseInt(num, 10));
  
    // Create date with explicit year, month (0-indexed), and day
    const date = new Date(year, month - 1, day);
  
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
    });
  };
  
  // Sort memories by date (ascending)
  const sortMemoriesByDate = (memories: Memory[]) => {
    return [...memories].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
  
      // Parse dates manually to avoid timezone issues
      const [aYear, aMonth, aDay] = a.date
        .split("-")
        .map((num) => parseInt(num, 10));
      const [bYear, bMonth, bDay] = b.date
        .split("-")
        .map((num) => parseInt(num, 10));
  
      // Compare year, then month, then day
      if (aYear !== bYear) return aYear - bYear;
      if (aMonth !== bMonth) return aMonth - bMonth;
      return aDay - bDay;
    });
  };
  
  // Scene positions for specific elements on the 512x512 grid
  const SCENE_ELEMENTS = {
    // Main elements
    DESK: { x: 209, y: 304, width: 84, height: 36 },
    DESK_SITTING: { x: 219, y: 264, width: 64, height: 64 },
    MAILBOX: { x: 61, y: 249, width: 52, height: 79 },
    CALENDAR: { x: 156, y: 226, width: 53, height: 53 },
    TELEGRAM: { x: 308, y: 242, width: 62, height: 80 },
    OUTSIDE: { x: 219, y: 366, width: 64, height: 64 },
  };
  
  export function App() {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
    const [newMemoryText, setNewMemoryText] = useState("");
    const [newMemoryDate, setNewMemoryDate] = useState(
      new Date().toISOString().split("T")[0]
    );
    const [newMemoryTags, setNewMemoryTags] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [woodUrl, setWoodUrl] = useState<string | null>(null);
    const [showNotebook, setShowNotebook] = useState(false);
    const [currentMemoryIndex, setCurrentMemoryIndex] = useState(0);
    const [showCaption, setShowCaption] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [cookieAndTeaMode, setCookieAndTeaMode] = useState(false);
  
    // Fetch images from backend instead of blob storage directly
    useEffect(() => {
      // Set default background color in case image doesn't load
      if (document.body) {
        document.body.style.backgroundColor = "#2D1700"; // Dark brown leather color
      }
  
      // Fetch avatar image
      fetch("/api/images/stevens.jpg")
        .then((response) => {
          if (response.ok) return response.blob();
          throw new Error("Failed to load avatar image");
        })
        .then((imageBlob) => {
          const url = URL.createObjectURL(imageBlob);
          setAvatarUrl(url);
        })
        .catch((err) => {
          console.error("Failed to load avatar:", err);
        });
  
      // Fetch wood background
      fetch("/api/images/wood.jpg")
        .then((response) => {
          if (response.ok) return response.blob();
          throw new Error("Failed to load wood background");
        })
        .then((imageBlob) => {
          const url = URL.createObjectURL(imageBlob);
          setWoodUrl(url);
  
          // Apply wood background to body
          if (document.body) {
            document.body.style.backgroundImage = `url(${url})`;
          }
        })
        .catch((err) => {
          console.error("Failed to load background:", err);
        });
  
      // Cleanup blob URLs on unmount
      return () => {
        if (avatarUrl) URL.revokeObjectURL(avatarUrl);
        if (woodUrl) URL.revokeObjectURL(woodUrl);
      };
    }, []);
  
    const fetchMemories = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(API_BASE);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
  
        // Change the sorting function to show memories in chronological order
        const sortedMemories = [...data].sort((a, b) => {
          const dateA = a.createdDate || 0;
          const dateB = b.createdDate || 0;
          return dateA - dateB; // Oldest first, chronological order
        });
  
        setMemories(sortedMemories);
  
        // Set current index to the last memory (newest one)
        if (sortedMemories.length > 0) {
          setCurrentMemoryIndex(sortedMemories.length - 1);
          setShowCaption(true);
        }
      } catch (e) {
        console.error("Failed to fetch memories:", e);
        setError(e.message || "Failed to fetch memories.");
      } finally {
        setLoading(false);
      }
    }, []);
  
    useEffect(() => {
      fetchMemories();
    }, [fetchMemories]);
  
    const handleAddMemory = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMemoryText.trim()) return;
  
      const memoryData: Omit<Memory, "id"> = {
        text: newMemoryText,
        date: newMemoryDate,
        tags: newMemoryTags || null,
      };
  
      try {
        const response = await fetch(API_BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(memoryData),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        setNewMemoryText("");
        setNewMemoryDate(new Date().toISOString().split("T")[0]);
        setNewMemoryTags("");
        setShowAddForm(false);
        await fetchMemories();
      } catch (e) {
        console.error("Failed to add memory:", e);
        setError(e.message || "Failed to add memory.");
      }
    };
  
    const handleDeleteMemory = async (id: string) => {
      if (!confirm("Are you sure you want to delete this memory?")) return;
  
      try {
        const response = await fetch(`${API_BASE}/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        await fetchMemories();
      } catch (e) {
        console.error("Failed to delete memory:", e);
        setError(e.message || "Failed to delete memory.");
      }
    };
  
    const handleEditMemory = (memory: Memory) => {
      setEditingMemory(memory);
    };
  
    const handleCancelEdit = () => {
      setEditingMemory(null);
    };
  
    const handleUpdateMemory = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingMemory || !editingMemory.text.trim()) return;
  
      const updatedFields: Partial<Omit<Memory, "id">> = {
        text: editingMemory.text,
        date: editingMemory.date,
        tags: editingMemory.tags,
      };
  
      try {
        const response = await fetch(`${API_BASE}/${editingMemory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedFields),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        setEditingMemory(null);
        await fetchMemories();
      } catch (e) {
        console.error("Failed to update memory:", e);
        setError(e.message || "Failed to update memory.");
      }
    };
  
    // Sort and paginate memories
    const sortedMemories = useMemo(
      () => sortMemoriesByDate(memories),
      [memories]
    );
  
    const totalPages = Math.max(
      1,
      Math.ceil(sortedMemories.length / MEMORIES_PER_PAGE)
    );
  
    const paginatedMemories = useMemo(() => {
      const startIndex = (currentPage - 1) * MEMORIES_PER_PAGE;
      return sortedMemories.slice(startIndex, startIndex + MEMORIES_PER_PAGE);
    }, [sortedMemories, currentPage]);
  
    const goToNextPage = () => {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    };
  
    const goToPrevPage = () => {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    };
  
    // Animation delay to keep Stevens in place briefly
    const handleAnimationEnd = () => {
      setIsAnimating(false);
    };
  
    // Memory navigation handlers
    const goToNextMemory = () => {
      if (currentMemoryIndex < memories.length - 1) {
        // Reset cookie and tea mode on navigation
        setCookieAndTeaMode(false);
  
        // Trigger animation transition
        setIsAnimating(true);
  
        // Change memory after a brief delay
        setCurrentMemoryIndex(currentMemoryIndex + 1);
        setShowCaption(true);
      }
    };
  
    const goToPrevMemory = () => {
      if (currentMemoryIndex > 0) {
        // Reset cookie and tea mode on navigation
        setCookieAndTeaMode(false);
  
        // Trigger animation transition
        setIsAnimating(true);
  
        // Change memory after a brief delay
        setCurrentMemoryIndex(currentMemoryIndex - 1);
        setShowCaption(true);
      }
    };
  
    // Add keyboard navigation
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (showNotebook) return; // Don't navigate when notebook is open
  
        if (e.key === "ArrowLeft") {
          goToPrevMemory();
        } else if (e.key === "ArrowRight") {
          goToNextMemory();
        }
      };
  
      window.addEventListener("keydown", handleKeyDown);
  
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [currentMemoryIndex, memories.length, showNotebook]);
  
    // Generate caption based on memory source and content
    const generateCaption = (memory: Memory | undefined) => {
      if (cookieAndTeaMode) {
        return "Ah, a lovely cup of tea and a cookie. Most refreshing indeed.";
      }
  
      if (!memory) return "No memories to display";
  
      const source = memory.createdBy || "unknown";
      const sourceText =
        source === SOURCE_TYPES.WEATHER
          ? "Hmm, I should check the weather today."
          : source === SOURCE_TYPES.MAIL
          ? "Ah! A new letter has arrived."
          : source === SOURCE_TYPES.TELEGRAM
          ? "A telegram! I must read it right away."
          : source === SOURCE_TYPES.CALENDAR
          ? "I should check my calendar."
          : "I must make note of this.";
  
      return `${sourceText} Note for ${memory.date}: ${memory.text}`;
    };
  
    // Handle cookie and tea button
    const handleServeCookieAndTea = () => {
      setCookieAndTeaMode(true);
    };
  
    // Get Stevens' position and appearance based on memory source
    const getStevensState = (memory: Memory | undefined) => {
      // Override with cookie and tea mode
      if (cookieAndTeaMode) {
        return {
          position: SCENE_ELEMENTS.DESK_SITTING,
          image: ASSETS.STEVENS_FRONT,
          highlightElement: SCENE_ELEMENTS.DESK,
          animationClass: "no-animation",
        };
      }
  
      if (!memory) {
        // Default state: sitting at desk
        return {
          position: SCENE_ELEMENTS.DESK_SITTING,
          image: ASSETS.STEVENS_FRONT,
          highlightElement: null,
          animationClass: "no-animation",
        };
      }
  
      const source = memory.createdBy || "unknown";
  
      switch (source) {
        case SOURCE_TYPES.MAIL:
          return {
            position: {
              x: SCENE_ELEMENTS.MAILBOX.x + 20,
              y: SCENE_ELEMENTS.MAILBOX.y - 20,
            },
            image: ASSETS.STEVENS_BACK,
            highlightElement: SCENE_ELEMENTS.MAILBOX,
            animationClass: "walk-to-mailbox",
          };
  
        case SOURCE_TYPES.CALENDAR:
          return {
            position: {
              x: SCENE_ELEMENTS.CALENDAR.x + 10,
              y: SCENE_ELEMENTS.CALENDAR.y + 30,
            },
            image: ASSETS.STEVENS_BACK,
            highlightElement: SCENE_ELEMENTS.CALENDAR,
            animationClass: "walk-to-calendar",
          };
  
        case SOURCE_TYPES.TELEGRAM:
          return {
            position: {
              x: SCENE_ELEMENTS.TELEGRAM.x - 20,
              y: SCENE_ELEMENTS.TELEGRAM.y + 10,
            },
            image: ASSETS.STEVENS_BACK,
            highlightElement: SCENE_ELEMENTS.TELEGRAM,
            animationClass: "walk-to-telegram",
          };
  
        case SOURCE_TYPES.WEATHER:
          return {
            position: SCENE_ELEMENTS.OUTSIDE,
            image: ASSETS.STEVENS_FRONT,
            highlightElement: null,
            animationClass: "walk-to-outside",
          };
  
        default:
          return {
            position: SCENE_ELEMENTS.DESK_SITTING,
            image: ASSETS.STEVENS_FRONT,
            highlightElement: SCENE_ELEMENTS.DESK,
            animationClass: "walk-to-desk",
          };
      }
    };
  
    // Current memory
    const currentMemory = memories[currentMemoryIndex];
    const caption = generateCaption(currentMemory);
    const stevensState = getStevensState(currentMemory);
  
    // Scale factor for world coordinates (1/2 original size)
    const scaleFactor = 0.5;
    const scalePosition = (pos: { x: number; y: number }) => ({
      x: pos.x * scaleFactor,
      y: pos.y * scaleFactor,
    });
  
    // Render edit form modal
    const renderEditForm = () => (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
        <form
          onSubmit={handleUpdateMemory}
          className="bg-[#f8f1e0] p-4 rounded-lg shadow-xl w-full max-w-lg border-2 border-[#8B4513]"
        >
          <h2 className="text-2xl font-pixel mb-2 text-[#4b3621]">Edit Entry</h2>
          <div className="mb-2">
            <label
              htmlFor="editText"
              className="block text-lg font-pixel text-[#4b3621] mb-1"
            >
              Text
            </label>
            <textarea
              id="editText"
              value={editingMemory?.text}
              onChange={(e) =>
                setEditingMemory({ ...editingMemory!, text: e.target.value })
              }
              className="w-full p-2 bg-[#fff8dc] border-2 border-[#8B4513] text-[#4b3621] focus:outline-none focus:border-[#654321] font-pixel text-base leading-[1.2em]"
              rows={3}
              required
            />
          </div>
          <div className="mb-2">
            <label
              htmlFor="editDate"
              className="block text-lg font-pixel text-[#4b3621] mb-1"
            >
              Date
            </label>
            <input
              type="date"
              id="editDate"
              value={editingMemory?.date?.split("T")[0] || ""}
              onChange={(e) =>
                setEditingMemory({ ...editingMemory!, date: e.target.value })
              }
              className="w-full p-1 bg-[#fff8dc] border-2 border-[#8B4513] text-[#4b3621] focus:outline-none focus:border-[#654321] font-pixel text-base"
            />
          </div>
          <div className="mb-2">
            <label
              htmlFor="editTags"
              className="block text-lg font-pixel text-[#4b3621] mb-1"
            >
              Source
            </label>
            <input
              type="text"
              id="editTags"
              value={editingMemory?.tags || ""}
              onChange={(e) =>
                setEditingMemory({ ...editingMemory!, tags: e.target.value })
              }
              className="w-full p-1 bg-[#fff8dc] border-2 border-[#8B4513] text-[#4b3621] focus:outline-none focus:border-[#654321] font-pixel text-base"
            />
          </div>
          <div className="flex justify-between mt-3">
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-3 py-1 bg-[#8B4513] text-[#f8f1e0] rounded font-pixel text-base hover:bg-[#654321] border-2 border-b-4 border-r-4 border-[#4b3621]"
              >
                UPDATE
              </button>
              <button
                type="button"
                onClick={() => setEditingMemory(null)}
                className="px-3 py-1 bg-[#A0522D] text-[#f8f1e0] rounded font-pixel text-base hover:bg-[#8B4513] border-2 border-b-4 border-r-4 border-[#4b3621]"
              >
                CANCEL
              </button>
            </div>
            <button
              type="button"
              onClick={handleDeleteMemory}
              className="px-3 py-1 bg-[#555555] text-white rounded font-pixel text-base hover:bg-[#333333] border-2 border-b-4 border-r-4 border-[#222222]"
            >
              DELETE
            </button>
          </div>
        </form>
      </div>
    );
  
    // Render add form
    const renderAddForm = () => (
      <div className="add-form mt-3">
        <form
          onSubmit={handleAddMemory}
          className="bg-[#f8f1e0] p-4 rounded-lg border-2 border-[#8B4513] opacity-95 shadow-xl"
        >
          <h2 className="text-2xl font-pixel mb-2 text-[#4b3621]">New Entry</h2>
          <div className="mb-2">
            <textarea
              id="newText"
              value={newMemoryText}
              onChange={(e) => setNewMemoryText(e.target.value)}
              className="w-full p-1 bg-[#fff8dc] border-2 border-[#8B4513] text-[#4b3621] focus:outline-none focus:border-[#654321] font-pixel text-base leading-[1.2em]"
              rows={2}
              placeholder="Enter your note..."
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div>
              <label
                htmlFor="newDate"
                className="block text-lg font-pixel text-[#4b3621] mb-1"
              >
                Date
              </label>
              <input
                type="date"
                id="newDate"
                value={newMemoryDate}
                onChange={(e) => setNewMemoryDate(e.target.value)}
                className="w-full p-1 bg-[#fff8dc] border-2 border-[#8B4513] text-[#4b3621] focus:outline-none focus:border-[#654321] font-pixel text-base"
              />
            </div>
            <div>
              <label
                htmlFor="newTags"
                className="block text-lg font-pixel text-[#4b3621] mb-1"
              >
                Source
              </label>
              <input
                type="text"
                id="newTags"
                value={newMemoryTags}
                onChange={(e) => setNewMemoryTags(e.target.value)}
                className="w-full p-1 bg-[#fff8dc] border-2 border-[#8B4513] text-[#4b3621] focus:outline-none focus:border-[#654321] font-pixel text-base"
                placeholder="Optional source"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              className="px-3 py-1 bg-[#8B4513] text-[#f8f1e0] rounded font-pixel text-base hover:bg-[#654321] border-2 border-b-4 border-r-4 border-[#4b3621]"
            >
              SAVE
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 bg-[#A0522D] text-[#f8f1e0] rounded font-pixel text-base hover:bg-[#8B4513] border-2 border-b-4 border-r-4 border-[#4b3621]"
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    );
  
    return (
      <div className="font-pixel text-[#f8f1e0]">
        <style jsx>{`
          @import url("https://fonts.googleapis.com/css2?family=Pixelify+Sans&display=swap");
  
          @tailwind base;
          @tailwind components;
          @tailwind utilities;
  
          .font-pixel {
            font-family: "Pixelify Sans", sans-serif;
            letter-spacing: 0.5px;
          }
  
          .notebook {
            background-color: #8b4513;
            border: 4px solid #654321;
            border-radius: 4px;
            box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.4),
              0 3px 8px rgba(0, 0, 0, 0.5);
            image-rendering: pixelated;
            cursor: pointer;
            transition: transform 0.2s;
          }
  
          .notebook:hover {
            transform: scale(1.05);
          }
  
          .notebook-pages {
            background-color: #f8f1e0;
            background-image: linear-gradient(#d6c6a5 1px, transparent 1px);
            background-size: 100% 16px;
            box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.3);
            image-rendering: pixelated;
          }
  
          .pixel-button {
            position: relative;
            cursor: pointer;
            transition: all 0.1s;
          }
  
          .pixel-button:active {
            transform: translate(2px, 2px);
            box-shadow: 0 0 0 rgba(0, 0, 0, 0.5);
          }
  
          .pixel-character {
            image-rendering: pixelated;
            position: absolute;
            transition: left 0.7s ease-in-out, top 0.7s ease-in-out;
          }
  
          .timeline-container {
            background-color: #111111;
            border-top: 4px solid #654321;
          }
  
          .caption-container {
            background-color: #111111;
            border-top: 4px solid #654321;
            border-bottom: 4px solid #654321;
          }
  
          .caption-box {
            background-color: rgba(0, 0, 0, 0.7);
            border: 4px solid #654321;
          }
  
          .highlight-glow {
            box-shadow: 0 0 10px 5px rgba(255, 215, 0, 0.6);
            border-radius: 4px;
            animation: pulse 1.5s infinite alternate;
          }
  
          @keyframes pulse {
            from {
              box-shadow: 0 0 10px 5px rgba(255, 215, 0, 0.3);
            }
            to {
              box-shadow: 0 0 15px 8px rgba(255, 215, 0, 0.6);
            }
          }
  
          /* Animation states for Stevens */
          .no-animation {
            transition: none;
          }
  
          /* Cookie and tea elements */
          .cookie {
            position: absolute;
            width: 8px;
            height: 8px;
            background-color: #d4a76a;
            border-radius: 50%;
            box-shadow: 0 0 2px rgba(0, 0, 0, 0.4);
          }
  
          .teacup {
            position: absolute;
            width: 14px;
            height: 10px;
            background-color: #f8f1e0;
            border: 2px solid #8b4513;
            border-radius: 2px 2px 5px 5px;
          }
  
          .teacup::after {
            content: "";
            position: absolute;
            right: -6px;
            top: 2px;
            width: 6px;
            height: 6px;
            border: 2px solid #8b4513;
            border-radius: 50%;
            border-left: none;
          }
  
          /* Tea and cookie button */
          .tea-button {
            background-color: #8b4513;
            color: #f8f1e0;
            border: 2px solid #654321;
            border-radius: 8px;
            padding: 6px 12px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.1s;
          }
  
          .tea-button:hover {
            background-color: #a0522d;
          }
  
          .tea-button:active {
            transform: translate(1px, 1px);
          }
  
          .notebook-clickable {
            position: absolute;
            cursor: pointer;
            transition: transform 0.2s;
            z-index: 10;
            border: 2px solid transparent;
          }
  
          .notebook-clickable:hover {
            transform: scale(1.1);
          }
        `}</style>
  
        {/* Main game container with fixed dimensions */}
        <div className="relative w-full max-w-[800px] mx-auto overflow-hidden bg-[#222]">
          {/* Game world */}
          <div
            className="w-[512px] h-[512px] mx-auto relative"
            style={{
              backgroundImage: `url(${ASSETS.BACKGROUND})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              imageRendering: "pixelated",
            }}
          >
            {/* Notebook clickable area (transparent) */}
            <div
              className="notebook-clickable"
              style={{
                left: `${SCENE_ELEMENTS.DESK.x + 20}px`,
                top: `${SCENE_ELEMENTS.DESK.y - 10}px`,
                width: "35px",
                height: "28px",
                backgroundColor: "transparent",
              }}
              onClick={() => setShowNotebook(true)}
              title="Click to open Stevens' notebook"
            ></div>
  
            {/* Highlight for interactive elements */}
            {stevensState.highlightElement && (
              <div
                className="highlight-glow absolute"
                style={{
                  left: `${stevensState.highlightElement.x}px`,
                  top: `${stevensState.highlightElement.y}px`,
                  width: `${stevensState.highlightElement.width}px`,
                  height: `${stevensState.highlightElement.height}px`,
                  pointerEvents: "none", // So it doesn't interfere with clicking
                }}
              ></div>
            )}
  
            {/* Stevens character */}
            <img
              src={stevensState.image}
              alt="Stevens"
              className={`pixel-character ${
                isAnimating ? stevensState.animationClass : ""
              }`}
              style={{
                left: `${stevensState.position.x}px`,
                top: `${stevensState.position.y}px`,
                width: "64px",
                height: "64px",
              }}
              onTransitionEnd={handleAnimationEnd}
            />
  
            {/* Cookie and teacup for easter egg */}
            {cookieAndTeaMode && (
              <>
                <div
                  className="cookie"
                  style={{
                    left: `${SCENE_ELEMENTS.DESK.x + 40}px`,
                    top: `${SCENE_ELEMENTS.DESK.y + 10}px`,
                  }}
                ></div>
                <div
                  className="teacup"
                  style={{
                    left: `${SCENE_ELEMENTS.DESK.x + 25}px`,
                    top: `${SCENE_ELEMENTS.DESK.y + 8}px`,
                  }}
                ></div>
              </>
            )}
          </div>
  
          {/* Caption area */}
          <div className="caption-container w-full px-8 py-4 min-h-[120px]">
            {showCaption && (currentMemory || cookieAndTeaMode) ? (
              <div className="caption-box p-4 rounded-lg">
                <p className="text-lg leading-relaxed">{caption}</p>
              </div>
            ) : (
              <div className="caption-box p-4 rounded-lg opacity-50">
                <p className="text-lg leading-relaxed">
                  Use arrows or buttons to navigate through Stevens' memories
                </p>
              </div>
            )}
          </div>
  
          {/* Timeline controls */}
          <div className="timeline-container w-full p-6">
            <div className="flex justify-between items-center">
              <div className="text-lg">
                {loading
                  ? "Loading memories..."
                  : `Memory ${currentMemoryIndex + 1} of ${memories.length}`}
              </div>
  
              <div className="flex gap-4">
                <button
                  onClick={goToPrevMemory}
                  disabled={currentMemoryIndex === 0}
                  className={`px-4 py-2 rounded-lg border-2 border-b-4 border-r-4 ${
                    currentMemoryIndex === 0
                      ? "bg-gray-600 border-gray-700 opacity-50 cursor-not-allowed"
                      : "bg-[#8B4513] border-[#654321] hover:bg-[#A0522D]"
                  }`}
                  aria-label="Previous memory"
                >
                  ◀ PREV
                </button>
  
                <button
                  onClick={goToNextMemory}
                  disabled={currentMemoryIndex >= memories.length - 1}
                  className={`px-4 py-2 rounded-lg border-2 border-b-4 border-r-4 ${
                    currentMemoryIndex >= memories.length - 1
                      ? "bg-gray-600 border-gray-700 opacity-50 cursor-not-allowed"
                      : "bg-[#8B4513] border-[#654321] hover:bg-[#A0522D]"
                  }`}
                  aria-label="Next memory"
                >
                  NEXT ▶
                </button>
              </div>
            </div>
  
            {error && (
              <div className="bg-red-800 border-2 border-red-900 p-2 rounded mt-4">
                {error}
              </div>
            )}
  
            {/* Timeline visualization and cookie/tea button */}
            <div className="h-[100px] mt-4 flex flex-col items-center justify-center">
              <div className="text-center mb-3">
                <div className="text-lg mb-2">
                  Source:{" "}
                  {cookieAndTeaMode
                    ? "Tea Time"
                    : currentMemory?.createdBy || "None"}
                </div>
                <div className="text-sm opacity-70">
                  Use ◀ ▶ arrow keys or buttons to navigate
                </div>
              </div>
  
              {/* Easter egg button */}
              <button
                onClick={handleServeCookieAndTea}
                className="tea-button mt-2"
                title="Serve Stevens a cookie and tea"
              >
                🍪☕ Serve Cookie &amp; Tea
              </button>
            </div>
          </div>
  
          {/* Notebook View Modal */}
          {showNotebook && (
            <NotebookView
              onClose={() => setShowNotebook(false)}
              avatarUrl={avatarUrl}
            />
          )}
        </div>
      </div>
    );
  }
  