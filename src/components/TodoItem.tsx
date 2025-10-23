
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Clock, CheckCircle, Circle, Edit, Trash2, Play, Pause } from 'lucide-react';

interface TodoItemProps {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: Date;
  completed: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updatedData: Partial<TodoItemProps>) => void;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  isRunning?: boolean;
  timeSpent?: number; // in seconds
}

const TodoItem: React.FC<TodoItemProps> = ({
  id,
  title,
  description,
  category,
  priority,
  dueDate,
  completed,
  onToggle,
  onDelete,
  onEdit,
  onStart,
  onStop,
  isRunning = false,
  timeSpent = 0,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description);
  const [editCategory, setEditCategory] = useState(category);
  const [editPriority, setEditPriority] = useState(priority);
  const [editDueDate, setEditDueDate] = useState(dueDate ? new Date(dueDate).toISOString().slice(0, 16) : '');
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    // Format date only on client side to avoid hydration mismatch
    if (dueDate) {
      setFormattedDate(new Date(dueDate).toLocaleDateString());
    }
  }, [dueDate]);

  const handleSaveEdit = () => {
    onEdit(id, {
      title: editTitle,
      description: editDescription,
      category: editCategory,
      priority: editPriority,
      dueDate: editDueDate ? new Date(editDueDate) : undefined,
    });
    setIsEditing(false);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };

  const getCategoryColor = () => {
    const colors = {
      work: 'bg-blue-100 text-blue-800',
      personal: 'bg-purple-100 text-purple-800',
      study: 'bg-indigo-100 text-indigo-800',
      health: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  return (
    <Card className={`mb-4 transition-all duration-200 ${isRunning ? 'ring-2 ring-blue-500' : ''} ${completed ? 'opacity-70' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <button
              onClick={() => onToggle(id)}
              className="mt-1"
              aria-label={completed ? 'Mark as incomplete' : 'Mark as complete'}
            >
              {completed ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>

            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mb-2"
                    placeholder="Task title"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full p-2 border rounded mb-2"
                    placeholder="Description"
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-2 mb-2">
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="p-2 border rounded"
                    >
                      <option value="work">Work</option>
                      <option value="personal">Personal</option>
                      <option value="study">Study</option>
                      <option value="health">Health</option>
                      <option value="other">Other</option>
                    </select>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as 'high' | 'medium' | 'low')}
                      className="p-2 border rounded"
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                    <Input
                      type="datetime-local"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="p-2 border rounded"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className={`font-semibold ${completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                      {title}
                    </h3>
                    <Badge className={priorityColors[priority]}>
                      {priority}
                    </Badge>
                    <Badge className={getCategoryColor()}>
                      {category}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {dueDate && (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>Due: {formattedDate}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Time: {formatTime(timeSpent)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            {!isEditing && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => isRunning ? onStop(id) : onStart(id)}
                  className={isRunning ? 'bg-yellow-100 hover:bg-yellow-200' : ''}
                >
                  {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodoItem;
