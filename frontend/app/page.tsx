export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-6 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 animate-pulse">
            Synapsis Dashboard
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Manage your academic life with elegant simplicity.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Today's Classes */}
          <div className="group bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 hover:shadow-3xl hover:-translate-y-2 transition-all duration-500 hover:border-blue-200">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg mr-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Today's Classes</h3>
                <p className="text-blue-600 font-semibold">2 sessions</p>
              </div>
            </div>
            <ul className="space-y-4">
              <li className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl hover:from-blue-100 transition-all">
                <span className="font-semibold text-gray-900">Math 101</span>
                <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">10:00 AM</span>
              </li>
              <li className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl hover:from-green-100 transition-all">
                <span className="font-semibold text-gray-900">Physics Lab</span>
                <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">2:00 PM</span>
              </li>
            </ul>
          </div>
          {/* Upcoming Exams */}
          <div className="group bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 hover:shadow-3xl hover:-translate-y-2 transition-all duration-500 hover:border-orange-200">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-lg mr-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Upcoming Exams</h3>
                <p className="text-orange-600 font-semibold">2 exams</p>
              </div>
            </div>
            <ul className="space-y-4">
              <li className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl hover:from-orange-100 transition-all">
                <div className="font-semibold text-gray-900 mb-1">Calculus Midterm</div>
                <div className="text-sm text-gray-500">May 5, 2026</div>
              </li>
              <li className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl hover:from-purple-100 transition-all">
                <div className="font-semibold text-gray-900 mb-1">Chemistry Final</div>
                <div className="text-sm text-gray-500">May 15, 2026</div>
              </li>
            </ul>
          </div>
          {/* Urgent Tasks */}
          <div className="group bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 hover:shadow-3xl hover:-translate-y-2 transition-all duration-500 hover:border-red-200">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl shadow-lg mr-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Urgent Tasks</h3>
                <p className="text-red-600 font-semibold">2 tasks</p>
              </div>
            </div>
            <ul className="space-y-4">
              <li className="flex items-center p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl hover:from-red-100 transition-all">
                <div className="w-4 h-4 bg-red-500 rounded-full mr-4"></div>
                <span className="font-semibold text-gray-900 flex-1">Finish Math Homework</span>
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">High</span>
              </li>
              <li className="flex items-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl hover:from-yellow-100 transition-all">
                <div className="w-4 h-4 bg-yellow-500 rounded-full mr-4"></div>
                <span className="font-semibold text-gray-900 flex-1">Review Physics Notes</span>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">Medium</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}