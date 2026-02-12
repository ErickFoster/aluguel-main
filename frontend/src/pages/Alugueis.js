import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Search, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '../lib/utils';

const Alugueis = () => {
  const { API, refreshVersion } = useAuth();
  const navigate = useNavigate();
  const [alugueis, setAlugueis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchAlugueis();
  }, [statusFilter, refreshVersion]);

  const fetchAlugueis = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const response = await axios.get(`${API}/alugueis`, { params });
      setAlugueis(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao carregar aluguéis'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchAlugueis();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ativo':
        return 'status-ativo';
      case 'finalizado':
        return 'status-finalizado';
      case 'atrasado':
        return 'status-atrasado';
      default:
        return '';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'ativo': 'Ativo',
      'finalizado': 'Finalizado',
      'atrasado': 'Atrasado'
    };
    return labels[status] || status;
  };

  const isAtrasado = (dataDevolucao) => {
    return new Date(dataDevolucao) < new Date();
  };

  const isProximo = (dataDevolucao) => {
    const hoje = new Date();
    const devolucao = new Date(dataDevolucao);
    const diffDias = Math.ceil((devolucao - hoje) / (1000 * 60 * 60 * 24));
    return diffDias >= 0 && diffDias <= 3;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="alugueis-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Aluguéis</h1>
          <p className="text-gray-600 mt-2">Gerencie os aluguéis de vestidos</p>
        </div>
        <Button data-testid="add-aluguel-button" onClick={() => navigate('/alugueis/novo')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Aluguel
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            data-testid="search-aluguel-input"
            placeholder="Buscar por cliente, CPF ou vestido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button data-testid="search-button" onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger data-testid="status-filter" className="w-full sm:w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {alugueis.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhum aluguel encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alugueis.map((aluguel) => (
            <div
              key={aluguel.id}
              data-testid={`aluguel-card-${aluguel.id}`}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition cursor-pointer"
              onClick={() => navigate(`/alugueis/${aluguel.id}`)}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{aluguel.cliente.nome_completo}</h3>
                    <span className={`status-badge ${getStatusColor(aluguel.status)}`}>
                      {getStatusLabel(aluguel.status)}
                    </span>
                    {aluguel.status === 'ativo' && isAtrasado(aluguel.data_devolucao) && (
                      <span className="status-badge status-atrasado">Atrasado</span>
                    )}
                    {aluguel.status === 'ativo' && isProximo(aluguel.data_devolucao) && !isAtrasado(aluguel.data_devolucao) && (
                      <span className="status-badge status-warning">Próximo</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">CPF: {aluguel.cliente.cpf}</p>
                  <p className="text-sm text-gray-600 mb-1">Telefone: {aluguel.cliente.telefone}</p>
                  <p className="text-sm font-medium text-gray-900 mb-2">Vestido: {aluguel.vestido_nome}</p>
                </div>

                <div className="flex flex-col md:items-end gap-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(aluguel.data_retirada).toLocaleDateString()} até {new Date(aluguel.data_devolucao).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">R$ {aluguel.valor_aluguel.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Sinal: R$ {aluguel.valor_sinal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Alugueis;