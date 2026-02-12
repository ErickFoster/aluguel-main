import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './App.css';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vestidos from './pages/Vestidos';
import NovoVestido from './pages/NovoVestido';
import DetalhesVestido from './pages/DetalhesVestido';
import Alugueis from './pages/Alugueis';
import NovoAluguel from './pages/NovoAluguel';
import DetalhesAluguel from './pages/DetalhesAluguel';
import Layout from './components/Layout';
import { Loader2 } from 'lucide-react';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <div className="App">
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="vestidos" element={<Vestidos />} />
            <Route path="vestidos/novo" element={<NovoVestido />} />
            <Route path="vestidos/:id" element={<DetalhesVestido />} />
            <Route path="alugueis" element={<Alugueis />} />
            <Route path="alugueis/novo" element={<NovoAluguel />} />
            <Route path="alugueis/:id" element={<DetalhesAluguel />} />
          </Route>
        </Routes>
      </HashRouter>
    </div>
  );
}

export default App;