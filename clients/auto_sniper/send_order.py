from typing import Dict, Optional, Literal
import requests


def send_open_position_order_prod(
    chain: str,
    token_address: str,
    trading_decision: str,
    created_at: str,
    model: Literal["tx1", "kx1", "lx1"],
    socials: Dict[str, Optional[str]],
    market_cap: str,
    exchange: str
) -> None:
    url = "https://auto-sniper-api-499636776518.europe-west6.run.app/open-position-order"

    payload = {
        "chain": chain,
        "tokenAddress": token_address,
        "tradingDecision": trading_decision,
        "createdAt": created_at,
        "model": model,
        "socials": socials,
        "marketCap": market_cap,
        "exchange": exchange
    }

    try:
        response = requests.post(url, json=payload, timeout=20)

        print(f"Status da resposta: {response.status_code}",
              f"Conteúdo da resposta: {response.text}")

        response.raise_for_status()
        print("Requisição enviada com sucesso")
    except requests.Timeout:
        print(f"Timeout ao enviar requisição para {url}")
    except requests.ConnectionError:
        print(f"Erro de conexão ao enviar requisição para {url}")
    except requests.RequestException as e:
        print(f"Erro na requisição: {str(e)}")
        if hasattr(e, 'response'):
            if e.response is not None:
                print(f"Status code: {e.response.status_code}")
                print(f"Resposta de erro: {e.response.text}")
    except Exception as e:
        print(f"Erro inesperado: {str(e)}")


def send_open_position_order_stg(
    chain: str,
    token_address: str,
    trading_decision: str,
    created_at: str,
    model: Literal["tx1", "kx1", "lx1"],
    socials: Dict[str, Optional[str]],
    market_cap: str,
    exchange: str
) -> None:
    url = "https://auto-sniper-api-1003522928061.europe-west6.run.app/open-position-order"

    payload = {
        "chain": chain,
        "tokenAddress": token_address,
        "tradingDecision": trading_decision,
        "createdAt": created_at,
        "model": model,
        "socials": socials,
        "marketCap": market_cap,
        "exchange": exchange
    }

    try:
        response = requests.post(url, json=payload, timeout=20)

        print(f"Status da resposta: {response.status_code}",
              f"Conteúdo da resposta: {response.text}")

        response.raise_for_status()
        print("Requisição enviada com sucesso")
    except requests.Timeout:
        print(f"Timeout ao enviar requisição para {url}")
    except requests.ConnectionError:
        print(f"Erro de conexão ao enviar requisição para {url}")
    except requests.RequestException as e:
        print(f"Erro na requisição: {str(e)}")
        if hasattr(e, 'response'):
            if e.response is not None:
                print(f"Status code: {e.response.status_code}")
                print(f"Resposta de erro: {e.response.text}")
    except Exception as e:
        print(f"Erro inesperado: {str(e)}")
