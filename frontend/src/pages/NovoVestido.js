import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '../lib/utils';

const NovoVestido = () => {
  const { API } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fotos, setFotos] = useState([]);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    categoria: '',
    tamanho: '',
    cor: '',
    descricao: '',
    valor_aluguel: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    setFotos(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('nome', formData.nome);
      formDataToSend.append('codigo', formData.codigo);
      formDataToSend.append('categoria', formData.categoria);
      formDataToSend.append('tamanho', formData.tamanho);
      formDataToSend.append('cor', formData.cor);
      formDataToSend.append('descricao', formData.descricao);
      formDataToSend.append('valor_aluguel', parseFloat(formData.valor_aluguel));

      fotos.forEach((foto) => {
        formDataToSend.append('fotos', foto);
      });

      await axios.post(`${API}/vestidos`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Vestido cadastrado com sucesso!');
      navigate('/vestidos');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao cadastrar vestido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="novo-vestido-page" className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/vestidos')} data-testid="back-button">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div>
        <h1 className="text-4xl font-semibold tracking-tight">Novo Vestido</h1>
        <p className="text-gray-600 mt-2">Cadastre um novo vestido no sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Vestido</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Vestido*</Label>
                <Input
                  id="nome"
                  data-testid="nome-input"
                  value={formData.nome}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigo">Código Interno*</Label>
                <Input
                  id="codigo"
                  data-testid="codigo-input"
                  value={formData.codigo}
                  onChange={(e) => handleChange('codigo', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria*</Label>
                <Select value={formData.categoria} onValueChange={(value) => handleChange('categoria', value)} required>
                  <SelectTrigger data-testid="categoria-select">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="festa">Festa</SelectItem>
                    <SelectItem value="noiva">Noiva</SelectItem>
                    <SelectItem value="madrinha">Madrinha</SelectItem>
                    <SelectItem value="debutante">Debutante</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tamanho">Tamanho*</Label>
                <Input
                  id="tamanho"
                  data-testid="tamanho-input"
                  placeholder="Ex: P, M, G, 38, 40"
                  value={formData.tamanho}
                  onChange={(e) => handleChange('tamanho', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cor">Cor*</Label>
                <Input
                  id="cor"
                  data-testid="cor-input"
                  value={formData.cor}
                  onChange={(e) => handleChange('cor', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_aluguel">Valor do Aluguel (R$)*</Label>
                <Input
                  id="valor_aluguel"
                  type="number"
                  step="0.01"
                  data-testid="valor-input"
                  value={formData.valor_aluguel}
                  onChange={(e) => handleChange('valor_aluguel', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                data-testid="descricao-input"
                rows={4}
                value={formData.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fotos">Fotos do Vestido</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <Input
                  id="fotos"
                  type="file"
                  data-testid="fotos-input"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="fotos" className="cursor-pointer">
                  <span className="text-sm text-gray-600">
                    Clique para selecionar ou arraste as fotos
                  </span>
                </label>
                {fotos.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">{fotos.length} foto(s) selecionada(s)</p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" data-testid="submit-button" disabled={loading}>
                {loading ? 'Cadastrando...' : 'Cadastrar Vestido'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/vestidos')}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NovoVestido;