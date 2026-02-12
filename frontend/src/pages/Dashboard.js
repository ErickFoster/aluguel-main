import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, Package, ShoppingBag, AlertCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '../lib/utils';

const Dashboard = () => {
  const { API, refreshVersion } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [refreshVersion]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao carregar estatísticas'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-gray-600 mt-2">Visão geral do sistema de aluguel de vestidos</p>
      </div>

      {stats?.alugueis_atrasados > 0 && (
        <div className="alert-danger" data-testid="alert-atrasados">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <strong>Atenção!</strong> Você tem {stats.alugueis_atrasados} aluguel(is) atrasado(s)!
          </div>
        </div>
      )}

      {stats?.alugueis_proximos > 0 && (
        <div className="alert-warning" data-testid="alert-proximos">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <strong>Aviso:</strong> {stats.alugueis_proximos} devolução(ões) próxima(s) nos próximos 3 dias.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="stat-total-vestidos">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Vestidos</CardTitle>
            <Package className="w-5 h-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats?.total_vestidos || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-disponiveis">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Disponíveis</CardTitle>
            <Package className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-green-600">{stats?.vestidos_disponiveis || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-alugados">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Alugados</CardTitle>
            <ShoppingBag className="w-5 h-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-red-600">{stats?.vestidos_alugados || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-manutencao">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Manutenção</CardTitle>
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-yellow-600">{stats?.vestidos_manutencao || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="stat-alugueis-ativos">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Aluguéis Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-blue-600">{stats?.alugueis_ativos || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-alugueis-proximos">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Devoluções Próximas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-yellow-600">{stats?.alugueis_proximos || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-alugueis-atrasados">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Atrasados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-red-600">{stats?.alugueis_atrasados || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="stat-faturamento-diario">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Faturamento Diário</CardTitle>
            <DollarSign className="w-5 h-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">R$ {stats?.faturamento_diario?.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-faturamento-semanal">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Faturamento Semanal</CardTitle>
            <DollarSign className="w-5 h-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">R$ {stats?.faturamento_semanal?.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-faturamento-mensal">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Faturamento Mensal</CardTitle>
            <DollarSign className="w-5 h-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">R$ {stats?.faturamento_mensal?.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;