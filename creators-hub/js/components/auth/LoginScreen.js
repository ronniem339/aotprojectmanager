const { useState } = React;

window.LoginScreen = ({ onLogin, firebaseAuth }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isRegister) {
                await firebaseAuth.createUserWithEmailAndPassword(email, password);
            } else {
                await firebaseAuth.signInWithEmailAndPassword(email, password);
            }
            onLogin();
        } catch (err) {
            console.error("Authentication error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 text-white p-4">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-center">Creator's Hub</h1>
            <p className="text-lg sm:text-xl text-gray-400 mb-8 text-center">Your AI-Powered Content Co-Pilot</p>

            <div className="glass-card p-6 sm:p-8 rounded-lg w-full max-w-md">
                <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6">
                    {isRegister ? 'Register' : 'Login'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-900/50 text-red-400 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full px-8 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <window.LoadingSpinner isButton={true} /> : (isRegister ? 'Register Account' : 'Login')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsRegister(!isRegister)}
                        className="text-secondary-accent hover:text-secondary-accent-light text-sm"
                    >
                        {isRegister ? 'Already have an account? Login' : 'Need an account? Register here'}
                    </button>
                </div>
            </div>
        </div>
    );
};
