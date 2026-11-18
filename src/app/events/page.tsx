"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/sidebar";
import { format } from 'date-fns';

interface Event {
  eventID: number;
  title: string;
  date: string;
  description: string;
  amount?: number;
  semester?: string;
}

export default function EventPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [form, setForm] = useState<Partial<Event>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch events");

      const data = await res.json();
      setEvents(Array.isArray(data.data) ? data.data : []);

    } catch (err) {
      console.error("Failed to fetch events", err);
      setError("Failed to load events. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDescription = (eventID: number) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [eventID]: !prev[eventID]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const method = isEditing ? "PUT" : "POST";
    const url = isEditing ? `/api/events/${form.eventID}` : "/api/events";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: form.amount ? Number(form.amount) : undefined,
        }),
      });

      if (!res.ok)
        throw new Error(`Failed to ${isEditing ? "update" : "create"} event`);

      setForm({});
      setIsEditing(false);
      await fetchEvents();
    } catch (err) {
      console.error("Error during form submission", err);
      setError(
        `Failed to ${isEditing ? "update" : "create"} event. Please try again.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    setIsLoading(true);
    setError(null);
    try {
     const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete event");
      await fetchEvents();
    } catch (err) {
      console.error("Failed to delete event", err);
      setError("Failed to delete event. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (event: Event) => {
    setForm(event);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 ml-0 md:ml-64 p-4 md:p-8 space-y-8 transition-all duration-300">
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-6">
          Manage Events
        </h1>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <p>{error}</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left box - Calendar + Event List */}
          <div className="w-full lg:w-1/2 bg-white/80 backdrop-blur-md shadow-md rounded-lg p-4 md:p-6 border border-gray-200">
            <div className="mb-6">
              <div className="w-full bg-green-100 text-green-800 p-3 md:p-4 rounded-md text-center font-semibold">
                📅 Calendar Placeholder - Today is {format(new Date(), 'MMM dd, yyyy')}
              </div>
            </div>

            {isLoading && !events.length ? (
              <div className="flex justify-center items-center h-40">
                <p>Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No events found. Create one to get started!
              </div>
            ) : (
              <ul className="space-y-3 overflow-y-auto max-h-[500px] pr-2">
                {events.map((event) => (
                  <li
                    key={event.eventID}
                    className="border p-3 md:p-4 rounded-lg shadow-sm bg-yellow-50 hover:bg-yellow-100 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="font-bold text-lg md:text-xl">
                          {event.title}
                        </h2>
                        <p className="text-xs md:text-sm text-gray-700 mb-2">
                          {format(new Date(event.date), 'MMM dd, yyyy')} |{" "}
                          {event.semester}
                        </p>
                      </div>
                      {event.amount && (
                        <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
                        ₱{event.amount}
                      </span>
                      )}
                    </div>

                    <p className="text-sm md:text-base text-gray-800 mb-3 whitespace-pre-wrap">
                      {expandedDescriptions[event.eventID] 
                        ? event.description 
                        : event.description.length > 100 
                          ? `${event.description.substring(0, 100)}...` 
                          : event.description}
                    </p>
                    {event.description.length > 100 && (
                      <button 
                        className="text-blue-600 text-sm hover:underline mb-3"
                        onClick={() => toggleDescription(event.eventID)}
                      >
                        {expandedDescriptions[event.eventID] ? "Show less" : "Read more"}
                      </button>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEdit(event)}
                        className="text-green-700 hover:text-green-800 hover:underline font-medium text-sm md:text-base"
                        disabled={isLoading}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(event.eventID)}
                        className="text-red-600 hover:text-red-700 hover:underline font-medium text-sm md:text-base"
                        disabled={isLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right box - Event Form */}
          <div className="w-full lg:w-1/2 bg-white/90 backdrop-blur-md shadow-lg rounded-lg p-4 md:p-6 border border-gray-300">
            <h2 className="text-xl font-bold mb-4">
              {isEditing ? "Edit Event" : "Create New Event"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  placeholder="Event Title"
                  value={form.title || ""}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={form.date || ""}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Event Description"
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (optional)
                </label>
                <input
                  type="number"
                  placeholder="Amount"
                  value={form.amount || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={isLoading}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester
                </label>
                <select
                  value={form.semester || ""}
                  onChange={(e) =>
                    setForm({ ...form, semester: e.target.value })
                  }
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  disabled={isLoading}
                >
                  <option value="">Select Semester</option>
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 md:py-3 bg-black text-white rounded-md font-semibold hover:bg-yellow-500 transition duration-300 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </span>
                ) : isEditing ? (
                  "Update Event"
                ) : (
                  "Add Event"
                )}
              </button>

              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setForm({});
                    setIsEditing(false);
                  }}
                  className="w-full py-2 md:py-3 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300 transition duration-300"
                  disabled={isLoading}
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );

}