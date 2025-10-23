
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ChevronLeft, ChevronRight, Clock, Calendar, AlertCircle } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  category: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

interface CalendarSchedulerProps {
  events: CalendarEvent[];
  onEventCreate: (event: Omit<CalendarEvent, 'id'>) => void;
  onEventUpdate: (id: string, event: Partial<CalendarEvent>) => void;
  onEventDelete: (id: string) => void;
}

const CalendarScheduler: React.FC<CalendarSchedulerProps> = ({
  events,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState<Omit<CalendarEvent, 'id'>>({
    title: '',
    description: '',
    startTime: new Date(),
    endTime: new Date(new Date().getTime() + 60 * 60 * 1000), // Default 1 hour
    category: 'work',
    priority: 'medium',
    completed: false,
  });

  // Calendar navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);

    const days = [];

    // Previous month's trailing days
    const prevMonthDays = getDaysInMonth(year, month - 1);
    for (let i = prevMonthDays - firstDayOfMonth + 1; i <= prevMonthDays; i++) {
      days.push({
        date: new Date(year, month - 1, i),
        isCurrentMonth: false,
      });
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month's leading days
    const totalCells = 42; // 6 weeks * 7 days
    const nextMonthDays = totalCells - days.length;
    for (let i = 1; i <= nextMonthDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });

    return dayEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  };

  // Handle form submission
  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEventCreate({ ...newEvent, startTime: new Date(newEvent.startTime), endTime: new Date(newEvent.endTime) });
    setShowEventForm(false);
    setNewEvent({
      title: '',
      description: '',
      startTime: new Date(),
      endTime: new Date(new Date().getTime() + 60 * 60 * 1000),
      category: 'work',
      priority: 'medium',
      completed: false,
    });
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Priority colors
  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };

  // Category colors
  const categoryColors = {
    work: 'bg-blue-100 text-blue-800',
    personal: 'bg-purple-100 text-purple-800',
    study: 'bg-indigo-100 text-indigo-800',
    health: 'bg-pink-100 text-pink-800',
    other: 'bg-gray-100 text-gray-800',
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              <span>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center font-medium py-2 text-sm">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const isToday = day.date.toDateString() === new Date().toDateString();
              const isSelected = day.date.toDateString() === selectedDate.toDateString();
              const dayEvents = getEventsForDay(day.date);

              return (
                <div
                  key={index}
                  className={`min-h-24 p-1 border rounded cursor-pointer transition-colors
                    ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                    ${isToday ? 'ring-2 ring-blue-500' : ''}
                    ${isSelected ? 'bg-blue-50' : ''}
                    hover:bg-gray-100`}
                  onClick={() => {
                    setSelectedDate(day.date);
                    setNewEvent({
                      ...newEvent,
                      startTime: new Date(day.date),
                      endTime: new Date(day.date.getTime() + 60 * 60 * 1000),
                    });
                  }}
                >
                  <div className="text-right mb-1">
                    <span className={`inline-block w-6 h-6 text-center leading-6 rounded-full
                      ${isToday ? 'bg-blue-500 text-white' : ''}`}>
                      {day.date.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1 overflow-y-auto max-h-20">
                    {dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 rounded truncate ${event.completed ? 'opacity-50' : ''}`}
                        style={{ backgroundColor: categoryColors[event.category as keyof typeof categoryColors].replace('100', '200') }}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium truncate">{event.title}</span>
                          <span className="ml-1">{formatTime(event.startTime)}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <Badge className={`text-xs ${priorityColors[event.priority]}`}>
                            {event.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event Form */}
      {showEventForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Event</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEventSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newEvent.startTime.toISOString().slice(0, 16)}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: new Date(e.target.value) })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newEvent.endTime.toISOString().slice(0, 16)}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: new Date(e.target.value) })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={newEvent.category}
                    onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="study">Study</option>
                    <option value="health">Health</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={newEvent.priority}
                    onChange={(e) => setNewEvent({ ...newEvent, priority: e.target.value as 'high' | 'medium' | 'low' })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowEventForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Event</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Selected Day Events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Events for {selectedDate.toLocaleDateString()}
          </CardTitle>
          <Button onClick={() => setShowEventForm(true)}>Add Event</Button>
        </CardHeader>
        <CardContent>
          {getEventsForDay(selectedDate).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No events scheduled for this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getEventsForDay(selectedDate).map(event => (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border ${event.completed ? 'opacity-70' : ''}`}
                  style={{ backgroundColor: categoryColors[event.category as keyof typeof categoryColors].replace('100', '50') }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold flex items-center">
                        {event.title}
                        {event.completed && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Completed
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>
                          {formatTime(event.startTime)} - {formatTime(event.endTime)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <Badge className={priorityColors[event.priority]}>
                        {event.priority}
                      </Badge>
                      <Badge className={categoryColors[event.category as keyof typeof categoryColors]}>
                        {event.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarScheduler;
