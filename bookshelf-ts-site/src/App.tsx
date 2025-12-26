import React from 'react';
import './App.css';
import './styles/library.css';
import './styles/rpgui-integration.css';
import { Home } from './pages/Home';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {

  return (
    <div className="rpgui-content">
      <div className="app">
        <ToastContainer position="top-right" autoClose={3000} />
        <Home />
      </div>
    </div>
  );
}

export default App;
