import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '../lib/utils';

const Vestidos = () => {
  const { API, refreshVersion } = useAuth();
  const navigate = useNavigate();
  const [vestidos, setVestidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchVestidos();
  }, [categoriaFilter, statusFilter, refreshVersion]);

  const fetchVestidos = async () => {
    try {
      const params = {};
      if (categoriaFilter) params.categoria = categoriaFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const response = await axios.get(`${API}/vestidos`, { params });
      setVestidos(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao carregar vestidos'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchVestidos();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'disponivel':
        return 'status-disponivel';
      case 'alugado':
        return 'status-alugado';
      case 'reservado':
        return 'status-reservado';
      case 'manutencao':
        return 'status-manutencao';
      default:
        return '';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'disponivel': 'Disponível',
      'alugado': 'Alugado',
      'reservado': 'Reservado',
      'manutencao': 'Manutenção'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="vestidos-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Vestidos</h1>
          <p className="text-gray-600 mt-2">Gerencie o catálogo de vestidos</p>
        </div>
        <Button data-testid="add-vestido-button" onClick={() => navigate('/vestidos/novo')}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Vestido
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            data-testid="search-vestido-input"
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button data-testid="search-button" onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger data-testid="categoria-filter" className="w-full sm:w-[200px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="festa">Festa</SelectItem>
            <SelectItem value="noiva">Noiva</SelectItem>
            <SelectItem value="madrinha">Madrinha</SelectItem>
            <SelectItem value="debutante">Debutante</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger data-testid="status-filter" className="w-full sm:w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="disponivel">Disponível</SelectItem>
            <SelectItem value="alugado">Alugado</SelectItem>
            <SelectItem value="reservado">Reservado</SelectItem>
            <SelectItem value="manutencao">Manutenção</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {vestidos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhum vestido encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {vestidos.map((vestido) => (
            <div
              key={vestido.id}
              data-testid={`vestido-card-${vestido.id}`}
              className="vestido-card cursor-pointer"
              onClick={() => navigate(`/vestidos/${vestido.id}`)}
            >
              {vestido.fotos && vestido.fotos.length > 0 ? (
                <img
                  src={`${process.env.REACT_APP_BACKEND_URL}${vestido.fotos[0]}`}
                  alt={vestido.nome}
                  className="vestido-image"
                />
              ) : (
                <div className="vestido-image bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">Sem foto</span>
                </div>
              )}

              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{vestido.nome}</h3>
                  <span className={`status-badge ${getStatusColor(vestido.status)}`}>
                    {getStatusLabel(vestido.status)}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-1">Código: {vestido.codigo}</p>
                <p className="text-sm text-gray-600 mb-2">{vestido.categoria} - Tam. {vestido.tamanho}</p>
                <p className="text-lg font-semibold text-gray-900">R$ {vestido.valor_aluguel.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Vestidos;