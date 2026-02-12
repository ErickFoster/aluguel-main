import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '../lib/utils';

const NovoAluguel = () => {
  const { API } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [vestidos, setVestidos] = useState([]);
  const [vestidoSelecionado, setVestidoSelecionado] = useState(null);
  const [formData, setFormData] = useState({
    vestido_id: '',
    cliente_nome: '',
    cliente_cpf: '',
    cliente_telefone: '',
    cliente_endereco: '',
    data_retirada: '',
    data_devolucao: '',
    valor_aluguel: '',
    valor_sinal: '',
    forma_pagamento: '',
    observacoes: ''
  });

  useEffect(() => {
    fetchVestidosDisponiveis();
  }, []);

  const fetchVestidosDisponiveis = async () => {
    try {
      const response = await axios.get(`${API}/vestidos`, {
        params: { status: 'disponivel' }
      });
      setVestidos(response.data);
    } catch (error) {
      toast.error('Erro ao carregar vestidos');
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVestidoChange = (vestidoId) => {
    const vestido = vestidos.find(v => v.id === vestidoId);
    setVestidoSelecionado(vestido);
    handleChange('vestido_id', vestidoId);
    handleChange('valor_aluguel', vestido?.valor_aluguel || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        vestido_id: formData.vestido_id,
        cliente: {
          nome_completo: formData.cliente_nome,
          cpf: formData.cliente_cpf,
          telefone: formData.cliente_telefone,
          endereco: formData.cliente_endereco
        },
        data_retirada: new Date(formData.data_retirada).toISOString(),
        data_devolucao: new Date(formData.data_devolucao).toISOString(),
        valor_aluguel: parseFloat(formData.valor_aluguel),
        valor_sinal: parseFloat(formData.valor_sinal),
        forma_pagamento: formData.forma_pagamento,
        observacoes: formData.observacoes
      };

      await axios.post(`${API}/alugueis`, payload);
      toast.success('Aluguel cadastrado com sucesso!');
      navigate('/alugueis');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao cadastrar aluguel'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="novo-aluguel-page" className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/alugueis')} data-testid="back-button">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div>
        <h1 className="text-4xl font-semibold tracking-tight">Novo Aluguel</h1>
        <p className="text-gray-600 mt-2">Registre um novo aluguel de vestido</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente_nome">Nome Completo*</Label>
                <Input
                  id="cliente_nome"
                  data-testid="cliente-nome-input"
                  value={formData.cliente_nome}
                  onChange={(e) => handleChange('cliente_nome', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente_cpf">CPF*</Label>
                <Input
                  id="cliente_cpf"
                  data-testid="cliente-cpf-input"
                  placeholder="000.000.000-00"
                  value={formData.cliente_cpf}
                  onChange={(e) => handleChange('cliente_cpf', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente_telefone">Telefone / WhatsApp*</Label>
                <Input
                  id="cliente_telefone"
                  data-testid="cliente-telefone-input"
                  placeholder="(00) 00000-0000"
                  value={formData.cliente_telefone}
                  onChange={(e) => handleChange('cliente_telefone', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente_endereco">Endereço*</Label>
                <Input
                  id="cliente_endereco"
                  data-testid="cliente-endereco-input"
                  value={formData.cliente_endereco}
                  onChange={(e) => handleChange('cliente_endereco', e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Aluguel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vestido_id">Vestido*</Label>
              <Select value={formData.vestido_id} onValueChange={handleVestidoChange} required>
                <SelectTrigger data-testid="vestido-select">
                  <SelectValue placeholder="Selecione um vestido" />
                </SelectTrigger>
                <SelectContent>
                  {vestidos.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">Nenhum vestido disponível</div>
                  ) : (
                    vestidos.map((vestido) => (
                      <SelectItem key={vestido.id} value={vestido.id}>
                        {vestido.nome} - {vestido.codigo} (R$ {vestido.valor_aluguel.toFixed(2)})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {vestidoSelecionado && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Categoria: {vestidoSelecionado.categoria}</p>
                  <p className="text-sm text-gray-600">Tamanho: {vestidoSelecionado.tamanho}</p>
                  <p className="text-sm text-gray-600">Cor: {vestidoSelecionado.cor}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_retirada">Data de Retirada*</Label>
                <Input
                  id="data_retirada"
                  type="date"
                  data-testid="data-retirada-input"
                  value={formData.data_retirada}
                  onChange={(e) => handleChange('data_retirada', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_devolucao">Data de Devolução*</Label>
                <Input
                  id="data_devolucao"
                  type="date"
                  data-testid="data-devolucao-input"
                  value={formData.data_devolucao}
                  onChange={(e) => handleChange('data_devolucao', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor_aluguel">Valor do Aluguel (R$)*</Label>
                <Input
                  id="valor_aluguel"
                  type="number"
                  step="0.01"
                  data-testid="valor-aluguel-input"
                  value={formData.valor_aluguel}
                  onChange={(e) => handleChange('valor_aluguel', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_sinal">Valor do Sinal (R$)*</Label>
                <Input
                  id="valor_sinal"
                  type="number"
                  step="0.01"
                  data-testid="valor-sinal-input"
                  value={formData.valor_sinal}
                  onChange={(e) => handleChange('valor_sinal', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="forma_pagamento">Forma de Pagamento*</Label>
                <Select value={formData.forma_pagamento} onValueChange={(value) => handleChange('forma_pagamento', value)} required>
                  <SelectTrigger data-testid="forma-pagamento-select">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                data-testid="observacoes-input"
                rows={3}
                value={formData.observacoes}
                onChange={(e) => handleChange('observacoes', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" data-testid="submit-button" disabled={loading || vestidos.length === 0}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cadastrando...
              </>
            ) : (
              'Cadastrar Aluguel'
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/alugueis')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NovoAluguel;