import { useState } from 'react';
import './App.css'
import { Home } from './Home.js'
import { Login } from './Login.js'

export function App() {
  const [isAuthed, setIsAuthed] = useState(false);

  return (
    <div className="app-root">
      {isAuthed ? <Home isAuthed={isAuthed} setIsAuthed={setIsAuthed} /> : <Login setIsAuthed={setIsAuthed} />}
    </div>
  );
};
