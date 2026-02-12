import requests
import sys
import json
from datetime import datetime, timedelta

class VestidosAPITester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_vestido_id = None
        self.created_aluguel_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for multipart/form-data
                    headers.pop('Content-Type', None)
                    response = requests.post(url, data=data, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@vestidos.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"✅ Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_vestido(self):
        """Test creating a new vestido"""
        vestido_data = {
            'nome': 'Vestido de Teste',
            'codigo': 'TEST001',
            'categoria': 'festa',
            'tamanho': 'M',
            'cor': 'Azul',
            'descricao': 'Vestido para testes automatizados',
            'valor_aluguel': '150.00'
        }
        
        # Create a dummy file for testing
        files = {'fotos': ('test.jpg', b'fake image data', 'image/jpeg')}
        
        success, response = self.run_test(
            "Create Vestido",
            "POST",
            "vestidos",
            200,  # Backend returns 200, not 201
            data=vestido_data,
            files=files
        )
        
        if success and 'id' in response:
            self.created_vestido_id = response['id']
            print(f"✅ Vestido created with ID: {self.created_vestido_id}")
            return True
        return False

    def test_get_vestidos(self):
        """Test getting all vestidos"""
        success, response = self.run_test(
            "Get All Vestidos",
            "GET",
            "vestidos",
            200
        )
        if success and isinstance(response, list):
            print(f"✅ Found {len(response)} vestidos")
            return True
        return False

    def test_get_vestido_by_id(self):
        """Test getting vestido by ID"""
        if not self.created_vestido_id:
            print("❌ No vestido ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Vestido by ID",
            "GET",
            f"vestidos/{self.created_vestido_id}",
            200
        )
        return success

    def test_update_vestido(self):
        """Test updating vestido"""
        if not self.created_vestido_id:
            print("❌ No vestido ID available for testing")
            return False
            
        update_data = {
            'nome': 'Vestido de Teste Atualizado',
            'valor_aluguel': 200.00
        }
        
        success, response = self.run_test(
            "Update Vestido",
            "PUT",
            f"vestidos/{self.created_vestido_id}",
            200,
            data=update_data
        )
        return success

    def test_create_aluguel(self):
        """Test creating a new aluguel"""
        if not self.created_vestido_id:
            print("❌ No vestido ID available for testing")
            return False
            
        hoje = datetime.now()
        devolucao = hoje + timedelta(days=7)
        
        aluguel_data = {
            'vestido_id': self.created_vestido_id,
            'cliente': {
                'nome_completo': 'Cliente de Teste',
                'cpf': '123.456.789-00',
                'telefone': '(11) 99999-9999',
                'endereco': 'Rua de Teste, 123'
            },
            'data_retirada': hoje.isoformat(),
            'data_devolucao': devolucao.isoformat(),
            'valor_aluguel': 200.00,
            'valor_sinal': 50.00,
            'forma_pagamento': 'pix',
            'observacoes': 'Aluguel de teste'
        }
        
        success, response = self.run_test(
            "Create Aluguel",
            "POST",
            "alugueis",
            200,  # Backend returns 200, not 201
            data=aluguel_data
        )
        
        if success and 'id' in response:
            self.created_aluguel_id = response['id']
            print(f"✅ Aluguel created with ID: {self.created_aluguel_id}")
            return True
        return False

    def test_vestido_status_change(self):
        """Test if vestido status changed to 'alugado' after creating aluguel"""
        if not self.created_vestido_id:
            print("❌ No vestido ID available for testing")
            return False
            
        success, response = self.run_test(
            "Check Vestido Status After Aluguel",
            "GET",
            f"vestidos/{self.created_vestido_id}",
            200
        )
        
        if success and response.get('status') == 'alugado':
            print("✅ Vestido status correctly changed to 'alugado'")
            return True
        else:
            print(f"❌ Expected status 'alugado', got '{response.get('status')}'")
            return False

    def test_get_alugueis(self):
        """Test getting all alugueis"""
        success, response = self.run_test(
            "Get All Alugueis",
            "GET",
            "alugueis",
            200
        )
        if success and isinstance(response, list):
            print(f"✅ Found {len(response)} alugueis")
            return True
        return False

    def test_update_aluguel_status(self):
        """Test updating aluguel status to finalizado"""
        if not self.created_aluguel_id:
            print("❌ No aluguel ID available for testing")
            return False
            
        update_data = {
            'status': 'finalizado',
            'avarias': 'Nenhuma avaria encontrada'
        }
        
        success, response = self.run_test(
            "Update Aluguel Status",
            "PUT",
            f"alugueis/{self.created_aluguel_id}",
            200,
            data=update_data
        )
        return success

    def test_vestido_status_return(self):
        """Test if vestido status returned to 'disponivel' after finalizing aluguel"""
        if not self.created_vestido_id:
            print("❌ No vestido ID available for testing")
            return False
            
        success, response = self.run_test(
            "Check Vestido Status After Finalizing Aluguel",
            "GET",
            f"vestidos/{self.created_vestido_id}",
            200
        )
        
        if success and response.get('status') == 'disponivel':
            print("✅ Vestido status correctly returned to 'disponivel'")
            return True
        else:
            print(f"❌ Expected status 'disponivel', got '{response.get('status')}'")
            return False

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success:
            required_fields = [
                'total_vestidos', 'vestidos_disponiveis', 'vestidos_alugados',
                'vestidos_manutencao', 'alugueis_ativos', 'alugueis_proximos',
                'alugueis_atrasados', 'faturamento_diario', 'faturamento_semanal',
                'faturamento_mensal'
            ]
            
            missing_fields = [field for field in required_fields if field not in response]
            if not missing_fields:
                print("✅ All dashboard fields present")
                return True
            else:
                print(f"❌ Missing dashboard fields: {missing_fields}")
                return False
        return False

    def test_search_vestidos(self):
        """Test vestido search functionality"""
        success, response = self.run_test(
            "Search Vestidos",
            "GET",
            "vestidos?search=Teste",
            200
        )
        return success

    def test_filter_vestidos(self):
        """Test vestido filtering"""
        success, response = self.run_test(
            "Filter Vestidos by Category",
            "GET",
            "vestidos?categoria=festa",
            200
        )
        return success

    def test_historico_vestido(self):
        """Test vestido history"""
        if not self.created_vestido_id:
            print("❌ No vestido ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Vestido History",
            "GET",
            f"historico/vestido/{self.created_vestido_id}",
            200
        )
        return success

    def cleanup(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        if self.created_aluguel_id:
            self.run_test(
                "Delete Test Aluguel",
                "DELETE",
                f"alugueis/{self.created_aluguel_id}",
                200
            )
            
        if self.created_vestido_id:
            self.run_test(
                "Delete Test Vestido",
                "DELETE",
                f"vestidos/{self.created_vestido_id}",
                200
            )

def main():
    print("🚀 Starting Vestidos API Tests...")
    tester = VestidosAPITester()

    # Authentication tests
    if not tester.test_login():
        print("❌ Login failed, stopping tests")
        return 1

    tester.test_get_me()

    # Vestido CRUD tests
    tester.test_create_vestido()
    tester.test_get_vestidos()
    tester.test_get_vestido_by_id()
    tester.test_update_vestido()
    tester.test_search_vestidos()
    tester.test_filter_vestidos()

    # Aluguel tests and status integration
    tester.test_create_aluguel()
    tester.test_vestido_status_change()
    tester.test_get_alugueis()
    tester.test_update_aluguel_status()
    tester.test_vestido_status_return()

    # Dashboard and history tests
    tester.test_dashboard_stats()
    tester.test_historico_vestido()

    # Cleanup
    tester.cleanup()

    # Print results
    print(f"\n📊 Tests completed: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())