# projeto-todolist

Como Rodar o Projeto Localmente:

É necessário o Node.js instalado em sua máquina. O npm será instalado junto com o Node.js.

Primeiros passos:

npm install
Configure as variáveis de ambiente:
Crie um arquivo chamado .env na raiz do projeto e adicione o seguinte conteúdo, preenchendo com suas próprias credenciais de e-mail.

EMAIL_HOST="catolica.com"
EMAIL_PORT=3000
EMAIL_USER="email@gmail.com"
EMAIL_PASS="senha-app"
Atenção: O valor de EMAIL_PASS deve ser uma "Senha de App" de 16 letras gerada na sua Conta Google, não sua senha de login comum por questões de segurança

Inicie o servidor:
npm run dev

Acesse a aplicação:
Abra seu navegador e acesse o seguinte endereço:
http://localhost:3001 (ou a porta que você configurou no arquivo server.js).