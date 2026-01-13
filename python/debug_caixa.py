import requests
import json
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Vamos pegar um concurso antigo que COM CERTEZA tem resultado (ex: 1150)
url = "https://servicebus2.caixa.gov.br/portaldeloterias/api/loteca/1150"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json'
}

print(f"📡 Consultando API: {url} ...")
try:
    response = requests.get(url, headers=headers, verify=False, timeout=10)
    data = response.json()
    
    print("\n✅ DADOS RECEBIDOS:")
    print(f"Concurso: {data.get('numero')}")
    print(f"Data: {data.get('dataApuracao')}")
    
    lista = data.get('listaJogos', [])
    if lista:
        print(f"\n🔍 Analisando o Jogo 1:")
        primeiro_jogo = lista[0]
        # Vamos imprimir as chaves para ver se mudou o nome (ex: golsMandante vs placarMandante)
        print(json.dumps(primeiro_jogo, indent=2, ensure_ascii=False))
        
        g_mandante = primeiro_jogo.get('golsMandante')
        g_visitante = primeiro_jogo.get('golsVisitante')
        
        print(f"\n🧪 Teste de Tipo:")
        print(f"Gols Mandante: {g_mandante} (Tipo: {type(g_mandante)})")
        print(f"Gols Visitante: {g_visitante} (Tipo: {type(g_visitante)})")
    else:
        print("❌ Lista de jogos veio vazia!")

except Exception as e:
    print(f"❌ Erro: {e}")