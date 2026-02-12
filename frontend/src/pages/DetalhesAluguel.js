import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Trash2, Loader2, User, Phone, MapPin, CreditCard, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '../lib/utils';

const DetalhesAluguel = () => {
  const { id } = useParams();
  const { API, refreshVersion } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [aluguel, setAluguel] = useState(null);
  const [vestido, setVestido] = useState(null);
  const [avarias, setAvarias] = useState('');
  const [status, setStatus] = useState('');
  const [valorPago, setValorPago] = useState(0);

  useEffect(() => {
    fetchAluguel();
  }, [id, refreshVersion]);

  const fetchAluguel = async () => {
    try {
      const response = await axios.get(`${API}/alugueis/${id}`);
      setAluguel(response.data);
      setAvarias(response.data.avarias || '');
      setStatus(response.data.status);
      setValorPago(response.data.valor_pago || 0);

      // Fetch vestido details
      const vestidoRes = await axios.get(`${API}/vestidos/${response.data.vestido_id}`);
      setVestido(vestidoRes.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao carregar aluguel'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`${API}/alugueis/${id}`, {
        status: status,
        avarias: avarias
      });
      toast.success('Aluguel atualizado com sucesso!');
      fetchAluguel();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao atualizar aluguel'));
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/alugueis/${id}`);
      toast.success('Aluguel excluído com sucesso!');
      navigate('/alugueis');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao excluir aluguel'));
    }
  };

  const handleQuitarPagamento = async () => {
    try {
      await axios.put(`${API}/alugueis/${id}`, {
        valor_pago: aluguel.valor_aluguel
      });
      toast.success('Pagamento total confirmado!');
      fetchAluguel();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao confirmar pagamento'));
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
    <div data-testid="detalhes-aluguel-page" className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/alugueis')} data-testid="back-button">
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
                Tem certeza que deseja excluir este aluguel? Esta ação não pode ser desfeita.
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
        <h1 className="text-4xl font-semibold tracking-tight">Detalhes do Aluguel</h1>
        <p className="text-gray-600 mt-2">Informações completas do aluguel</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-gray-600">Nome Completo</Label>
                <p className="text-gray-900 font-medium">{aluguel?.cliente.nome_completo}</p>
              </div>
              <div>
                <Label className="text-gray-600">CPF</Label>
                <p className="text-gray-900 font-medium">{aluguel?.cliente.cpf}</p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-600" />
                <p className="text-gray-900 font-medium">{aluguel?.cliente.telefone}</p>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-600 mt-1" />
                <p className="text-gray-900 font-medium">{aluguel?.cliente.endereco}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dados do Aluguel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Vestido</Label>
                  <p className="text-gray-900 font-medium">{aluguel?.vestido_nome}</p>
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => navigate(`/vestidos/${aluguel?.vestido_id}`)}
                  >
                    Ver detalhes do vestido
                  </Button>
                </div>

                <div>
                  <Label className="text-gray-600">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger data-testid="status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <div>
                    <Label className="text-gray-600">Data de Retirada</Label>
                    <p className="text-gray-900 font-medium">
                      {new Date(aluguel?.data_retirada).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <div>
                    <Label className="text-gray-600">Data de Devolução</Label>
                    <p className="text-gray-900 font-medium">
                      {new Date(aluguel?.data_devolucao).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-600">Valor do Aluguel</Label>
                  <p className="text-2xl font-semibold text-gray-900">R$ {aluguel?.valor_aluguel?.toFixed(2) || '0.00'}</p>
                </div>

                <div>
                  <Label className="text-gray-600">Valor do Sinal</Label>
                  <p className="text-xl font-semibold text-gray-900">R$ {aluguel?.valor_sinal?.toFixed(2) || '0.00'}</p>
                </div>

                <div className="md:col-span-1">
                  <Label className="text-gray-600">Valor Já Pago</Label>
                  <p className="text-xl font-semibold text-green-600">R$ {aluguel?.valor_pago?.toFixed(2) || '0.00'}</p>
                </div>

                <div className="md:col-span-1">
                  <Label className="text-gray-600">Saldo Devedor</Label>
                  <p className={`text-xl font-semibold ${(aluguel?.valor_aluguel - (aluguel?.valor_pago || 0)) > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    R$ {(aluguel?.valor_aluguel - (aluguel?.valor_pago || 0))?.toFixed(2) || '0.00'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  {(aluguel?.valor_aluguel - (aluguel?.valor_pago || 0)) > 0 && (
                    <Button
                      variant="outline"
                      className="w-full border-green-600 text-green-600 hover:bg-green-50"
                      onClick={handleQuitarPagamento}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Confirmar Pagamento Total
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-600" />
                  <div>
                    <Label className="text-gray-600">Forma de Pagamento</Label>
                    <p className="text-gray-900 font-medium capitalize">{aluguel?.forma_pagamento.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>

              {aluguel?.observacoes && (
                <div>
                  <Label className="text-gray-600">Observações</Label>
                  <p className="text-gray-900">{aluguel.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Avarias e Observações pós-devolução</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="avarias">Registrar avarias ou problemas</Label>
                <Textarea
                  id="avarias"
                  data-testid="avarias-input"
                  rows={4}
                  value={avarias}
                  onChange={(e) => setAvarias(e.target.value)}
                  placeholder="Descreva quaisquer avarias encontradas após a devolução..."
                />
              </div>
              <Button onClick={handleUpdate} data-testid="update-button">
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          {vestido && (
            <Card>
              <CardHeader>
                <CardTitle>Vestido Alugado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {vestido.fotos && vestido.fotos.length > 0 && (
                  <img
                    src={`${process.env.REACT_APP_BACKEND_URL}${vestido.fotos[0]}`}
                    alt={vestido.nome}
                    className="w-full rounded-lg"
                  />
                )}
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{vestido.nome}</h3>
                  <p className="text-sm text-gray-600">Código: {vestido.codigo}</p>
                  <p className="text-sm text-gray-600">Categoria: {vestido.categoria}</p>
                  <p className="text-sm text-gray-600">Tamanho: {vestido.tamanho}</p>
                  <p className="text-sm text-gray-600">Cor: {vestido.cor}</p>
                  <span className={`status-badge status-${vestido.status}`}>
                    {vestido.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetalhesAluguel;