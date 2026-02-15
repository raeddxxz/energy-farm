# Energy Farm - TODO

## Banco de Dados e Autenticação
- [x] Definir schema de usuários com saldo e dados de conta
- [x] Criar tabela de itens NFT do usuário com tempo de vida
- [x] Criar tabela de transações (depósitos e saques)
- [x] Criar tabela de solicitações de depósito/saque pendentes
- [x] Implementar autenticação de usuários

## Página Principal
- [x] Exibir itens do usuário com tempo de vida restante
- [x] Mostrar valor de compra de cada item
- [x] Exibir pagamento diário individual por item
- [x] Calcular e exibir pagamento total diário
- [x] Implementar atualização em tempo real a cada segundo
- [x] Mostrar ganho acumulado em tempo real

## Loja
- [x] Criar lista de 6 geradores com dados corretos
- [x] Implementar sistema de compra com validação de saldo
- [x] Exibir custo, lucro total, vida útil e lucro diário
- [x] Ordenar itens do mais barato ao mais caro

## Carteira
- [x] Exibir saldo do usuário
- [x] Implementar sistema de depósito com endereço de destino
- [x] Adicionar campo para endereço do usuário no depósito
- [x] Implementar aviso de 1 hora para completar depósito
- [x] Limitar a 1 depósito por dia
- [x] Implementar sistema de saque com endereço e quantidade
- [x] Criar histórico de transações
- [x] Implementar aprovação automática de depósitos
- [x] Implementar processamento automático de saques

## Painel Administrativo
- [x] Criar página protegida apenas para admin
- [x] Exibir total de usuários
- [x] Exibir valor total depositado
- [x] Listar histórico de depósitos com endereço completo
- [x] Listar histórico de saques com endereço completo
- [x] Exibir estatísticas de transações

## Sistema Multilíngue
- [x] Criar arquivo de traduções com 7 idiomas
- [x] Implementar seletor de idioma nas configurações
- [x] Traduzir toda interface para: PT, EN, ES, FR, DE, ZH, JA
- [x] Persistir idioma selecionado

## Menu de Navegação
- [x] Criar menu fixo inferior com 4 opções
- [x] Implementar navegação entre páginas
- [x] Adicionar opção de Configurações com idioma e admin

## Testes e Refinamentos
- [x] Testar sistema de ganhos em tempo real
- [x] Testar compra de itens
- [x] Testar depósitos e saques
- [x] Testar painel administrativo
- [x] Testar sistema multilíngue
- [x] Verificar responsividade mobile

## Correções Necessárias - Endereços Blockchain
- [x] Corrigir geração de endereços TON válidos
- [x] Corrigir geração de endereços BEP20 válidos
- [x] Criar job de monitoramento que roda a cada minuto
- [x] Rastrear qual usuário é dono de cada endereço
- [x] Creditar saldo automaticamente quando transação é detectada
- [x] Adicionar seletor de cripto (TON ou USDT BEP20) no depósito
- [x] Atualizar interface para mostrar endereços separados por rede
- [x] Testar endereços gerados em exploradores de blockchain


## Novas Alterações - Fase 2
- [ ] Corrigir persistência de ganhos em tempo real (salvar no BD)
- [ ] Converter preços dos itens de USDT para RDX (fixo)
- [ ] Implementar autenticação com senha no painel admin (Rdx151208$71890@)
- [ ] Adicionar controles de desabilitar depósitos, saques e conversão
- [ ] Implementar sistema de queimar RDX no pool
- [ ] Implementar sistema de adicionar RDX no pool
- [ ] Adicionar sistema de envio de RDX para usuários
- [ ] Implementar sistema de referral com link único por usuário
- [ ] Adicionar ganho de 10% do depósito para quem convidou
- [ ] Criar novo menu "Referência" no menu inferior
- [ ] Mostrar total de USDT circulando (depósitos - saques) no admin
- [ ] Mostrar volume total de RDX circulando no admin


## Fase 3 - Interface Admin e Referral
- [ ] Criar interface do painel admin com autenticação de senha
- [ ] Implementar controles de toggle para depósitos/saques/conversão
- [ ] Adicionar formulários para queimar/adicionar RDX
- [ ] Adicionar formulário para enviar RDX para usuários
- [ ] Implementar geração de link único de referência por usuário
- [ ] Criar rastreamento de referidos
- [ ] Implementar crédito automático de 10% do depósito
- [ ] Criar página de referência com link de convite
- [ ] Mostrar número de referidos na página
- [ ] Mostrar ganhos totais por referências
- [ ] Adicionar menu "Referência" no menu inferior
- [ ] Testar sistema de referral completo

## Fase 4 - Alterações de Exibição (Fevereiro 2026)
- [x] Exibir ganhos diários em RDX na página principal
- [x] Exibir ganhos em tempo real em RDX
- [x] Exibir valores de itens comprados em RDX
- [x] Remover texto "receber X USDT" do botão de venda
- [x] Implementar modal de confirmação para venda de itens
- [x] Modal mostra "Você quer vender o item X por X USDT?" com Yes/No
- [x] Adicionar traduções para modal em todos os 7 idiomas
- [x] Testar funcionamento do modal
- [x] Verificar se todos os testes passam

## Correções de Cálculos (Fevereiro 2026)
- [x] Corrigir cálculos de ganhos: converter USDT para RDX multiplicando por 1000
- [x] Corrigir preço de venda para mostrar em RDX (50% do preço de compra em RDX)
- [x] Garantir que ganho em tempo real está acumulando corretamente
- [x] Todos os 8 testes passando após correções

## Bugs Encontrados e Corrigidos (Fevereiro 2026)
- [x] Ganhos em tempo real param de subir quando usuário sai da tela principal - CORRIGIDO com localStorage + timestamp
- [x] Ganhos não persistem ao sair do site - CORRIGIDO usando localStorage em vez de sessionStorage
- [x] Ganhos acumulados enquanto fora do app - IMPLEMENTADO cálculo de gap temporal
- [x] Ganhos só salvam no banco quando clicar em "Coletar RDX" - MANTIDO como esperado
