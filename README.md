# Controle de Assinaturas — Demo

Versão demonstrativa de um SaaS para gerenciamento de assinaturas, controle de gastos recorrentes, análise financeira e acompanhamento de renovações.

## Acesso demonstrativo
- **E-mail:** demo@subcontrol.com
- **Senha:** demo123

## Limitações
- Os registros são fictícios.
- Não exige banco de dados ou variáveis de ambiente.
- Assinaturas, categorias, configurações e pagamentos ficam no `localStorage` do navegador.
- Não há sincronização entre dispositivos; limpar os dados do site restaura os registros iniciais.
- A autenticação é simulada no frontend e não representa uma barreira de segurança.
- A conversão de moedas diferentes de BRL depende de uma API pública e de conexão com a internet.

**Não insira informações pessoais ou financeiras reais nesta demonstração.** Não há cobrança, integração de pagamentos nem gerenciamento real de contas.

## Executar localmente
```bash
npm install
npm run dev
npm run build
```
