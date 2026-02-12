import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '../lib/utils';

const DetalhesVestido = () => {
  const { id } = useParams();
  const { API, refreshVersion } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vestido, setVestido] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchVestido();
    fetchHistorico();
  }, [id, refreshVersion]);

  const fetchVestido = async () => {
    try {
      const response = await axios.get(`${API}/vestidos/${id}`);
      setVestido(response.data);
      setFormData(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao carregar vestido'));
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorico = async () => {
    try {
      const response = await axios.get(`${API}/historico/vestido/${id}`);
      setHistorico(response.data);
    } catch (error) {
      console.error('Erro ao carregar histórico');
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`${API}/vestidos/${id}`, {
        nome: formData.nome,
        codigo: formData.codigo,
        categoria: formData.categoria,
        tamanho: formData.tamanho,
        cor: formData.cor,
        descricao: formData.descricao,
        valor_aluguel: parseFloat(formData.valor_aluguel),
        status: formData.status
      });
      toast.success('Vestido atualizado com sucesso!');
      setEditMode(false);
      fetchVestido();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao atualizar vestido'));
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/vestidos/${id}`);
      toast.success('Vestido excluído com sucesso!');
      navigate('/vestidos');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao excluir vestido'));
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
    <div data-testid="detalhes-vestido-page" className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/vestidos')} data-testid="back-button">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" data-testid="delete-button">
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este vestido? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} data-testid="confirm-delete-button">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div>
        <h1 className="text-4xl font-semibold tracking-tight">{vestido?.nome}</h1>
        <p className="text-gray-600 mt-2">Código: {vestido?.codigo}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Informações do Vestido</CardTitle>
              {!editMode ? (
                <Button onClick={() => setEditMode(true)} data-testid="edit-button">Editar</Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleUpdate} data-testid="save-button">Salvar</Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  {editMode ? (
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900">{vestido?.nome}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Código</Label>
                  {editMode ? (
                    <Input
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900">{vestido?.codigo}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  {editMode ? (
                    <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="festa">Festa</SelectItem>
                        <SelectItem value="noiva">Noiva</SelectItem>
                        <SelectItem value="madrinha">Madrinha</SelectItem>
                        <SelectItem value="debutante">Debutante</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-gray-900">{vestido?.categoria}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tamanho</Label>
                  {editMode ? (
                    <Input
                      value={formData.tamanho}
                      onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900">{vestido?.tamanho}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Cor</Label>
                  {editMode ? (
                    <Input
                      value={formData.cor}
                      onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900">{vestido?.cor}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Valor do Aluguel</Label>
                  {editMode ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_aluguel}
                      onChange={(e) => setFormData({ ...formData, valor_aluguel: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900">R$ {vestido?.valor_aluguel?.toFixed(2)}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  {editMode ? (
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger data-testid="status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disponivel">Disponível</SelectItem>
                        <SelectItem value="alugado">Alugado</SelectItem>
                        <SelectItem value="reservado">Reservado</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-gray-900">{vestido?.status}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                {editMode ? (
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={4}
                  />
                ) : (
                  <p className="text-gray-900">{vestido?.descricao || 'Não informada'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de Aluguéis</CardTitle>
            </CardHeader>
            <CardContent>
              {historico.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhum aluguel registrado</p>
              ) : (
                <div className="space-y-3">
                  {historico.map((aluguel) => (
                    <div key={aluguel.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{aluguel.cliente.nome_completo}</p>
                          <p className="text-sm text-gray-600">CPF: {aluguel.cliente.cpf}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(aluguel.data_retirada).toLocaleDateString()} até {new Date(aluguel.data_devolucao).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`status-badge status-${aluguel.status}`}>{aluguel.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Fotos</CardTitle>
            </CardHeader>
            <CardContent>
              {vestido?.fotos && vestido.fotos.length > 0 ? (
                <div className="space-y-4">
                  {vestido.fotos.map((foto, index) => (
                    <img
                      key={index}
                      src={`${process.env.REACT_APP_BACKEND_URL}${foto}`}
                      alt={`${vestido.nome} ${index + 1}`}
                      className="w-full rounded-lg"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhuma foto disponível</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DetalhesVestido;