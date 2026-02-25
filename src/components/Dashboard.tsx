import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Task, User as UserType, Sprint, Epic } from '../types';
import { TrendingUp, CheckCircle2, Clock, AlertCircle, Users, Activity, Layers } from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
  users: UserType[];
  sprints: Sprint[];
  epics: Epic[];
}

export default function Dashboard({ tasks, users, sprints, epics }: DashboardProps) {
  const statusData = [
    { name: 'To Do', value: tasks.filter(t => t.column_id === 'todo').length },
    { name: 'In Progress', value: tasks.filter(t => t.column_id === 'in-progress').length },
    { name: 'Review', value: tasks.filter(t => t.column_id === 'review').length },
    { name: 'Done', value: tasks.filter(t => t.column_id === 'done').length },
  ];

  const priorityData = [
    { name: 'P1 - Critical', count: tasks.filter(t => t.priority === 'P1').length },
    { name: 'P2 - High', count: tasks.filter(t => t.priority === 'P2').length },
    { name: 'P3 - Medium', count: tasks.filter(t => t.priority === 'P3').length },
  ];

  const typeData = [
    { name: 'Task', count: tasks.filter(t => t.type === 'task' as any).length },
    { name: 'Story', count: tasks.filter(t => t.type === 'story').length },
    { name: 'Bug', count: tasks.filter(t => t.type === 'bug').length },
    { name: 'Issue', count: tasks.filter(t => t.type === 'issue').length },
  ];

  const epicProgressData = epics.map(epic => ({
    name: epic.title,
    progress: epic.progress || 0
  })).slice(0, 5); // Top 5 epics

  const workloadData = users.map(user => ({
    name: user.full_name,
    tasks: tasks.filter(t => t.assignee_id === user.id).length,
    completed: tasks.filter(t => t.assignee_id === user.id && t.column_id === 'done').length
  }));

  const sprintData = sprints.map(sprint => ({
    name: sprint.name,
    total: tasks.filter(t => t.sprint_id === sprint.id).length,
    done: tasks.filter(t => t.sprint_id === sprint.id && t.column_id === 'done').length
  }));

  const COLORS = ['#6366F1', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];
  const TYPE_COLORS = ['#3B82F6', '#EF4444', '#F59E0B'];

  const stats = [
    { label: 'Total Tasks', value: tasks.length, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Completed', value: tasks.filter(t => t.column_id === 'done').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'In Progress', value: tasks.filter(t => t.column_id === 'in-progress').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Critical (P1)', value: tasks.filter(t => t.priority === 'P1').length, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <h3 className="text-3xl font-bold mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Epic Progress */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Layers size={20} className="text-indigo-600" />
            <h3 className="text-lg font-bold">Strategic Epic Progress</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={epicProgressData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F3F4F6" />
                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} width={120} />
                <Tooltip 
                  cursor={{ fill: '#F9FAFB' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="progress" name="Progress %" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Workload by User */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Users size={20} className="text-indigo-600" />
            <h3 className="text-lg font-bold">User Workload</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F3F4F6" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} width={100} />
                <Tooltip 
                  cursor={{ fill: '#F9FAFB' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend />
                <Bar dataKey="tasks" name="Total Tasks" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sprint Progress */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Activity size={20} className="text-emerald-600" />
            <h3 className="text-lg font-bold">Sprint Progress</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sprintData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#F9FAFB' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend />
                <Bar dataKey="total" name="Total Tasks" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="done" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Type Breakdown */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Type Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Priority Breakdown</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {priorityData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-xs font-medium text-gray-600">{d.name}: {d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
