import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Login } from './Login.tsx';

export const App = () => {
  const navigate = useNavigate();

  const handleRegister = () => {
    navigate('/register');
  }

  return (
    <>
      <main className="container">
        <Login />
        <hr />
      </main>
      <footer className="container">
        <button onClick={handleRegister}>Register</button>
      </footer>
    </>
  );
};
