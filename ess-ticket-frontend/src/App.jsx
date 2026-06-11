import { useState } from 'react';

function App() {
  // 1. Operational Mode Toggles (Login vs Register)
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  // 2. Form Input Fields State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  
  // 3. UI Response States
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  // 4. Form Submission Handler with Pre-Flight Email Check
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', isError: false });

    // Step 1: Strict Email Format Regex Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage({ 
        text: '⚠️ Invalid email format! Please enter a valid address (e.g., name@example.com).', 
        isError: true 
      });
      return; // Absolute Halt: Blocks network request execution
    }

    setLoading(true);

    // Dynamic API routing configurations based on layout view state
    const endpoint = isRegisterMode 
      ? 'http://localhost:5000/api/auth/register' 
      : 'http://localhost:5000/api/auth/login';

    const payload = isRegisterMode 
      ? { name, email, password, role } 
      : { email, password, selectedRole: role };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Operation encountered a system fault.');
      }

      if (isRegisterMode) {
        setMessage({ text: 'Account created successfully! Switching to login...', isError: false });
        // Smooth timeout to switch context tabs for user
        setTimeout(() => {
          setIsRegisterMode(false);
          setName('');
          setPassword('');
          setMessage({ text: '', isError: false });
        }, 2000);
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setMessage({ text: `Success! Welcome back, ${data.user.name}.`, isError: false });
      }

    } catch (err) {
      setMessage({ text: err.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4">
      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-md p-8 rounded-2xl border border-slate-700/50 shadow-2xl transition-all duration-300">
        
        {/* Branding & Subtitle Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            {isRegisterMode ? 'CREATE ACCOUNT' : 'ESS TICKETING'}
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            {isRegisterMode ? 'Register a new profile to access the cluster' : 'Sign in to manage your server logs & issues'}
          </p>
        </div>

        {/* Dynamic Warning & Success Message Banner */}
        {message.text && (
          <div className={`p-4 mb-6 rounded-lg text-sm font-medium border ${
            message.isError 
              ? 'bg-red-500/10 border-red-500/20 text-red-400' 
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Interactive Data Entry Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Step 2: Conditional Name Field (Only on Register View) */}
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Nafyad"
              />
            </div>
          )}

          {/* Optimized HTML5 Email Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="nafyadtilahun4@gmail.com"
            />
          </div>

          {/* Secure Password Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {/* Role Access Multi-Selector Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              {isRegisterMode ? 'Assign Account Access Level' : 'Portal Access Level'}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="customer">Customer Portal</option>
              <option value="it_staff">IT Support Specialist</option>
              <option value="admin">System Administrator</option>
            </select>
          </div>

          {/* Processing submission action toggle button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform active:scale-[0.98] mt-4"
          >
            {loading 
              ? 'Processing Secure Operations...' 
              : isRegisterMode ? 'Initialize System Access' : 'Secure Authorization'
            }
          </button>
        </form>

        {/* View Shift Interface Subtext Toggle */}
        <div className="mt-6 text-center text-sm">
          <button
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setMessage({ text: '', isError: false });
            }}
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors focus:outline-none"
          >
            {isRegisterMode 
              ? 'Already registered? Log in to system' 
              : "Don't have an account? Create one here"
            }
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;