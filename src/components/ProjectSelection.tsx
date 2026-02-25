import { Project } from '../types';

interface ProjectSelectionProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
}

export default function ProjectSelection({ projects, onSelectProject }: ProjectSelectionProps) {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Select a Project</h1>
        <div className="space-y-4">
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="w-full text-left px-6 py-4 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg transition-all"
            >
              <h2 className="font-bold text-lg">{project.name}</h2>
              <p className="text-sm text-gray-500">{project.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
