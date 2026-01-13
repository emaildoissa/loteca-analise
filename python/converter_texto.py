import re
import csv
from datetime import datetime, timedelta

# --- CONFIGURAÇÃO ---
NUMERO_CONCURSO = 1228     # Mude para o número certo
DATA_APURACAO = "2025-12-30" # Data do sorteio (YYYY-MM-DD)
ARQUIVO_ENTRADA = "python/entrada.txt"
ARQUIVO_SAIDA = "proximo_concurso.csv"

def limpar_time(nome):
    # Remove espaços extras e caracteres invisíveis
    return nome.strip()

def processar_texto():
    jogos = []
    
    print(f"📖 Lendo {ARQUIVO_ENTRADA}...")
    
    try:
        with open(ARQUIVO_ENTRADA, 'r', encoding='utf-8') as f:
            linhas = f.readlines()
    except FileNotFoundError:
        print(f"❌ Erro: Crie o arquivo '{ARQUIVO_ENTRADA}' e cole o texto dos jogos lá!")
        return

    for linha in linhas:
        linha = linha.strip()
        if not linha or "JogoColuna" in linha: continue # Pula cabeçalho ou linhas vazias
        
        # Tenta capturar: Numero + Time1 + (x ou espaço) + Time2 + Dia
        # Regex explicaçao: 
        # ^(\d+) -> Começa com numero
        # \s+ -> Espaços
        # (.+?) -> Time 1 (pega o mínimo possível)
        # \s+(?:x|X|-)?\s+ -> Separador (pode ser x, -, ou só espaço grande)
        # (.+?) -> Time 2
        # \s+(?:Sábado|Domingo|Segunda|Terça|Quarta|Quinta|Sexta).*$ -> Termina com dia da semana
        
        # Tenta primeiro dividir por TAB ou Espaço Duplo (comum em cópia de site)
        partes = re.split(r'\t|\s{2,}', linha)
        
        mandante = ""
        visitante = ""

        if len(partes) >= 3:
            # Caso 1: O copy-paste manteve a formatação de colunas (Sorte sua!)
            # Ex: ['1', 'CRYSTAL PALACE', 'TOTTENHAM', 'Domingo']
            # Removemos o primeiro item se for número
            if partes[0].isdigit(): partes.pop(0)
            
            mandante = partes[0]
            # O visitante é o próximo item que não seja "x" ou vazio
            for p in partes[1:]:
                if p.lower().strip() not in ['x', '-', 'vs']:
                    visitante = p
                    break
        else:
            # Caso 2: Virou uma linguiça de texto (O chat faz isso)
            # Ex: "1 CRYSTAL PALACE TOTTENHAM Domingo"
            # Vamos tentar remover o dia e o número e dividir no meio
            
            # Remove dia da semana do final
            linha_sem_dia = re.sub(r'\s*(Sábado|Domingo|Segunda|Terça|Quarta|Quinta|Sexta).*$', '', linha, flags=re.IGNORECASE)
            # Remove número do início
            texto_times = re.sub(r'^\d+\s+', '', linha_sem_dia)
            
            # Tenta achar um " x " ou " vs "
            if ' x ' in texto_times.lower():
                m, v = re.split(r'\s+x\s+', texto_times, flags=re.IGNORECASE, maxsplit=1)
                mandante, visitante = m, v
            else:
                # Último recurso: chutar divisão por palavras (perigoso para nomes compostos)
                # DICA: No arquivo de texto, tente dar um TAB entre os times se der erro
                palavras = texto_times.split()
                metade = len(palavras) // 2
                mandante = " ".join(palavras[:metade])
                visitante = " ".join(palavras[metade:])
                print(f"⚠️  Aviso: Dividindo '{texto_times}' no meio. Verifique se está certo.")

        if mandante and visitante:
            jogos.append({
                "m": limpar_time(mandante),
                "v": limpar_time(visitante)
            })

    if len(jogos) != 14:
        print(f"⚠️  Atenção: Encontrei {len(jogos)} jogos. O ideal são 14.")

    # Gerar CSV
    header = ["Concurso","Data"]
    row = [NUMERO_CONCURSO, DATA_APURACAO]
    
    for i in range(1, 15):
        header.extend([f"Time{i}M", f"Time{i}V", f"Res{i}"])
        if i <= len(jogos):
            row.extend([jogos[i-1]['m'], jogos[i-1]['v'], ""]) # Resultado vazio
        else:
            row.extend(["TIME_M", "TIME_V", ""])

    print(f"💾 Salvando {ARQUIVO_SAIDA}...")
    with open(ARQUIVO_SAIDA, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerow(row)
    
    print("✅ Sucesso! Agora é só importar o 'proximo_concurso.csv' no site.")

if __name__ == "__main__":
    processar_texto()