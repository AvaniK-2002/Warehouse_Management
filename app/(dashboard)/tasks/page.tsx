'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Upload, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  due_date: string | null;
  status: string;
  priority: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date');

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'In Progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-green-100 text-green-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Task Manager</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track and manage warehouse tasks
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  {getStatusIcon(task.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{task.title}</h3>
                    {task.description && (
                      <p className="mt-1 text-sm text-slate-600">{task.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                      {task.assignee && <span>Assigned to: {task.assignee}</span>}
                      {task.due_date && (
                        <span>Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getPriorityColor(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      task.status === 'Completed'
                        ? 'bg-green-100 text-green-700'
                        : task.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
