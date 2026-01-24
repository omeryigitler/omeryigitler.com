import React, { useState, useEffect } from 'react';
import { SeoProject, SeoCategory, SeoTask, Language } from '../types';
import { DEFAULT_SEO_TEMPLATE } from '../constants';
import { TRANSLATIONS } from '../translations';
import { 
  Plus, Trash2, ChevronDown, ChevronRight, CheckCircle, 
  Circle, FileText, Globe, Calendar, Percent, Save, X, ListTodo 
} from 'lucide-react';

interface Props {
  language: Language;
  initialClientName?: string;
}

const SeoTracker: React.FC<Props> = ({ language, initialClientName }) => {
  const [projects, setProjects] = useState<SeoProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectUrl, setNewProjectUrl] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['technical', 'content']);
  const [hideCompleted, setHideCompleted] = useState(false);

  const t = TRANSLATIONS[language].seo;

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedProjects = localStorage.getItem('seo_projects');
    if (savedProjects) {
      setProjects(JSON.parse(savedProjects));
    }
  }, []);

  // Save to LocalStorage on change
  useEffect(() => {
    localStorage.setItem('seo_projects', JSON.stringify(projects));
  }, [projects]);

  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleOpenModal = () => {
    if (initialClientName) {
      setNewProjectName(initialClientName);
    }
    setIsModalOpen(true);
  };

  const handleCreateProject = () => {
    if (!newProjectName) return;

    const newProject: SeoProject = {
      id: Date.now().toString(),
      clientName: newProjectName,
      websiteUrl: newProjectUrl,
      createdAt: new Date().toLocaleDateString(language === Language.TR ? 'tr-TR' : 'en-GB'),
      categories: JSON.parse(JSON.stringify(DEFAULT_SEO_TEMPLATE)) // Deep copy to avoid reference issues
    };

    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    setActiveProjectId(newProject.id);
    setIsModalOpen(false);
    setNewProjectName('');
    setNewProjectUrl('');
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(t.deleteConfirm)) {
      setProjects(projects.filter(p => p.id !== id));
      if (activeProjectId === id) setActiveProjectId(null);
    }
  };

  const toggleTask = (catId: string, taskId: string) => {
    if (!activeProjectId) return;

    const updatedProjects = projects.map(project => {
      if (project.id === activeProjectId) {
        return {
          ...project,
          categories: project.categories.map(cat => {
            if (cat.id === catId) {
              return {
                ...cat,
                tasks: cat.tasks.map(task => 
                  task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
                )
              };
            }
            return cat;
          })
        };
      }
      return project;
    });

    setProjects(updatedProjects);
  };

  const updateNote = (catId: string, taskId: string, note: string) => {
     if (!activeProjectId) return;

    const updatedProjects = projects.map(project => {
      if (project.id === activeProjectId) {
        return {
          ...project,
          categories: project.categories.map(cat => {
            if (cat.id === catId) {
              return {
                ...cat,
                tasks: cat.tasks.map(task => 
                  task.id === taskId ? { ...task, note: note } : task
                )
              };
            }
            return cat;
          })
        };
      }
      return project;
    });

    setProjects(updatedProjects);
  };

  const addNewTask = (catId: string) => {
    const title = prompt(t.newTaskTitle);
    if (!title || !activeProjectId) return;

    const updatedProjects = projects.map(project => {
      if (project.id === activeProjectId) {
        return {
          ...project,
          categories: project.categories.map(cat => {
            if (cat.id === catId) {
              return {
                ...cat,
                tasks: [...cat.tasks, { id: `custom-${Date.now()}`, title, isCompleted: false, note: '' }]
              };
            }
            return cat;
          })
        };
      }
      return project;
    });
    setProjects(updatedProjects);
  }

  const toggleCategory = (catId: string) => {
    if (expandedCategories.includes(catId)) {
      setExpandedCategories(expandedCategories.filter(id => id !== catId));
    } else {
      setExpandedCategories([...expandedCategories, catId]);
    }
  };

  const calculateProgress = (project: SeoProject) => {
    let total = 0;
    let completed = 0;
    project.categories.forEach(cat => {
      cat.tasks.forEach(task => {
        total++;
        if (task.isCompleted) completed++;
      });
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-black font-sans">
      
      {/* Sidebar - Project List */}
      <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white font-poppins mb-4">{t.myProjects}</h2>
          <button 
            onClick={handleOpenModal}
            className="w-full flex items-center justify-center space-x-2 bg-yellow-400 hover:bg-taurusGold text-black py-3 rounded-lg font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newProject}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {projects.length === 0 && (
             <div className="text-center text-zinc-500 py-10 text-sm">
               {t.noProjects}
             </div>
          )}
          {projects.map(project => {
            const progress = calculateProgress(project);
            return (
              <div 
                key={project.id}
                onClick={() => setActiveProjectId(project.id)}
                className={`group p-4 rounded-xl cursor-pointer border transition-all ${
                  activeProjectId === project.id 
                  ? 'bg-black border-yellow-400 shadow-[0_0_15px_rgba(255,215,0,0.1)]' 
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-bold ${activeProjectId === project.id ? 'text-white' : 'text-zinc-300'}`}>
                    {project.clientName}
                  </h3>
                  <button onClick={(e) => handleDeleteProject(e, project.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-zinc-500 mb-3 truncate flex items-center">
                   <Globe className="w-3 h-3 mr-1" /> {project.websiteUrl || 'URL yok'}
                </div>
                
                {/* Mini Progress Bar */}
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-yellow-400 h-full transition-all duration-500" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                   <span>{t.progress}</span>
                   <span className={progress === 100 ? 'text-green-500' : 'text-yellow-400'}>%{progress}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-black overflow-y-auto custom-scrollbar">
        {activeProject ? (
          <div className="max-w-5xl mx-auto px-8 py-10">
            {/* Project Header */}
            <div className="flex items-end justify-between mb-10 pb-6 border-b border-zinc-800">
               <div>
                  <h1 className="text-4xl font-extrabold text-white font-poppins mb-2">{activeProject.clientName}</h1>
                  <a href={activeProject.websiteUrl} target="_blank" rel="noreferrer" className="text-yellow-400 hover:underline flex items-center space-x-2 text-sm">
                    <Globe className="w-4 h-4" />
                    <span>{activeProject.websiteUrl}</span>
                  </a>
               </div>
               <div className="text-right">
                  <div className="flex items-center space-x-4 mb-2">
                     <div className="text-right">
                        <span className="block text-xs text-zinc-500 uppercase font-bold tracking-wider">{t.totalSuccess}</span>
                        <span className="text-3xl font-bold text-white font-poppins">%{calculateProgress(activeProject)}</span>
                     </div>
                     <div className="w-16 h-16 relative flex items-center justify-center">
                        <Percent className="w-8 h-8 text-zinc-700 absolute" />
                        <svg className="w-full h-full transform -rotate-90">
                           <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-zinc-800" />
                           <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-yellow-400" strokeDasharray={175} strokeDashoffset={175 - (175 * calculateProgress(activeProject) / 100)} />
                        </svg>
                     </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-zinc-500">{t.hideCompleted}</span>
                    <button 
                      onClick={() => setHideCompleted(!hideCompleted)}
                      className={`w-10 h-5 rounded-full p-1 transition-colors ${hideCompleted ? 'bg-yellow-400' : 'bg-zinc-700'}`}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${hideCompleted ? 'translate-x-5' : ''}`}></div>
                    </button>
                  </div>
               </div>
            </div>

            {/* Categories */}
            <div className="space-y-6">
              {activeProject.categories.map(category => (
                <div key={category.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
                  {/* Category Header */}
                  <div 
                    onClick={() => toggleCategory(category.id)}
                    className="flex items-center justify-between p-6 cursor-pointer bg-zinc-900 hover:bg-zinc-800/80 transition-colors border-b border-zinc-800/50 select-none"
                  >
                    <div className="flex items-center space-x-4">
                       <div className={`p-2 rounded-lg ${expandedCategories.includes(category.id) ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                          {expandedCategories.includes(category.id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                       </div>
                       <h3 className="text-xl font-bold text-white">{category.title}</h3>
                       <span className="text-xs font-bold bg-zinc-800 text-zinc-400 px-2 py-1 rounded border border-zinc-700">
                         {category.tasks.filter(t => t.isCompleted).length} / {category.tasks.length}
                       </span>
                    </div>
                  </div>

                  {/* Tasks List */}
                  {expandedCategories.includes(category.id) && (
                    <div className="p-2 bg-black/30">
                      {category.tasks.filter(t => !hideCompleted || !t.isCompleted).map(task => (
                        <div key={task.id} className="group border-b border-zinc-800 last:border-0 p-4 hover:bg-zinc-900/50 transition-colors">
                          <div className="flex items-start justify-between">
                             <div className="flex items-start space-x-4 flex-1">
                                <button 
                                  onClick={() => toggleTask(category.id, task.id)}
                                  className={`mt-1 flex-shrink-0 transition-all ${task.isCompleted ? 'text-green-500 scale-110' : 'text-zinc-600 hover:text-zinc-400'}`}
                                >
                                  {task.isCompleted ? <CheckCircle className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6" />}
                                </button>
                                
                                <div className="flex-1">
                                   <p className={`text-base font-medium transition-all ${task.isCompleted ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                                     {task.title}
                                   </p>
                                   
                                   {/* Note Section */}
                                   <div className="mt-3">
                                      <div className="relative">
                                        <textarea
                                          value={task.note}
                                          onChange={(e) => updateNote(category.id, task.id, e.target.value)}
                                          placeholder={t.addNote}
                                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all resize-none h-20 placeholder-zinc-700"
                                        />
                                        <div className="absolute top-3 right-3 text-zinc-700 pointer-events-none">
                                           <FileText className="w-4 h-4" />
                                        </div>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </div>
                        </div>
                      ))}

                      {/* Add Task Button */}
                      <button 
                        onClick={() => addNewTask(category.id)}
                        className="w-full py-4 flex items-center justify-center text-sm font-bold text-zinc-500 hover:text-yellow-400 hover:bg-zinc-900 transition-colors border-t border-zinc-800 border-dashed"
                      >
                         <Plus className="w-4 h-4 mr-2" />
                         {t.addTask}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="bg-zinc-900 p-8 rounded-full mb-6 border border-zinc-800">
               <ListTodo className="w-16 h-16 text-zinc-600" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2 font-poppins">{t.trackerTitle}</h2>
            <p className="text-zinc-500 max-w-md">
              {t.trackerDesc}
            </p>
            <button 
              onClick={handleOpenModal}
              className="mt-8 px-8 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-taurusGold transition-all shadow-lg shadow-yellow-400/20"
            >
              {t.startNow}
            </button>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-2xl p-8 shadow-2xl relative">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h2 className="text-2xl font-bold text-white mb-6 font-poppins">{t.modalTitle}</h2>
              
              <div className="space-y-5">
                 <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t.clientName}</label>
                    <input 
                      type="text" 
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl p-4 text-white focus:border-yellow-400 focus:outline-none"
                      placeholder="Örn: ABC Lojistik"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t.website}</label>
                    <input 
                      type="text" 
                      value={newProjectUrl}
                      onChange={(e) => setNewProjectUrl(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl p-4 text-white focus:border-yellow-400 focus:outline-none"
                      placeholder={t.urlPlaceholder}
                    />
                 </div>
                 
                 <button 
                   onClick={handleCreateProject}
                   disabled={!newProjectName}
                   className="w-full bg-yellow-400 hover:bg-taurusGold disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-all mt-4"
                 >
                   {t.createBtn}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SeoTracker;