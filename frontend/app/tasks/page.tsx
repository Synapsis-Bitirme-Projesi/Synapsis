export default function TasksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-6 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Tasks
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Stay organized and conquer your to-do list.</p>
        </div>
        {/* Add Task Form */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 mb-12 max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Add New Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input 
              type="text" 
              placeholder="Task name" 
              className="p-4 border border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm hover:shadow-md"
            />
            <select className="p-4 border border-gray-300 rounded-2xl focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm hover:shadow-md">
              <option>Select Course</option>
              <option>Math 101</option>
              <option>Physics</option>
              <option>Chemistry</option>
            </select>
            <select className="p-4 border border-gray-300 rounded-2xl focus:ring-4 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all shadow-sm hover:shadow-md">
              <option>Priority</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <button className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-8 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-1 transition-all duration-300">
            + Add Task
          </button>
        </div>
        {/* Tasks List */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">My Tasks</h3>
          <ul className="space-y-4">
            <li className="group flex items-start p-6 border border-gray-200 rounded-2xl hover:shadow-xl hover:border-blue-200 transition-all duration-300 bg-gradient-to-r from-blue-50 to-indigo-50">
              <input type="checkbox" className="mr-4 mt-1 w-6 h-6 rounded-lg flex-shrink-0 border-2 border-gray-300 focus:ring-blue-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 mb-2 flex items-center">
                  Finish Math Homework
                  <span className="ml-3 px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full shadow-sm">High</span>
                  <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full shadow-sm">Math 101</span>
                </div>
                <div className="text-sm text-gray-500 mb-2">Due: Tomorrow • Created: Today</div>
                <div className="flex items-center text-xs text-gray-400">
                  <span>Priority: High</span>
                </div>
              </div>
              <button className="ml-4 text-gray-500 hover:text-red-500 p-2 rounded-lg transition-colors group-hover:bg-red-50">
                ✕
              </button>
            </li>
            <li className="group flex items-start p-6 border border-gray-200 rounded-2xl hover:shadow-xl hover:border-yellow-200 transition-all duration-300 bg-gradient-to-r from-yellow-50 to-orange-50">
              <input type="checkbox" checked className="mr-4 mt-1 w-6 h-6 rounded-lg flex-shrink-0 border-2 border-green-300 bg-green-100 focus:ring-green-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-500 line-through mb-2 flex items-center">
                  Review Physics Notes
                  <span className="ml-3 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full shadow-sm">Medium</span>
                  <span className="ml-2 px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-semibold rounded-full shadow-sm">Physics</span>
                </div>
                <div className="text-sm text-gray-500 mb-2">Due: This week • Completed</div>
              </div>
              <button className="ml-4 text-gray-500 hover:text-red-500 p-2 rounded-lg transition-colors group-hover:bg-red-50">
                ✕
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}