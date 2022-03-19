const { response } = require("express");
const express = require("express");
const app = express();
app.use(express.json())

const { v4: uuidv4 } = require("uuid")

const customers = [] // array que recebe os usuários da aplicação. Note que ele está em escopo global.

function verifyIfExistsAccountCPF(req, res, next){ 

    const { cpf } = req.headers; // definindo o CPF, através do header

    const customer = customers.find( customer => customer.cpf === cpf) // procura dentro do array global se existe um cpf registrado igual ao cpf do paramêtro

    if(!customer){
        return res.status(400).json({ error: "Customer not found." })
    }  // verificando se há conta existente, caso não haja, não deve ser possível buscar o extrato bancário.
    
    req.customer = customer; // exportando o objeto customers para o escopo global através da requisição

    return next();
} // middleware que irá verificar se existe usuário ou não

function getBalance(statement){ // middleware que irá definir o balanço total do statement
    const balance = statement.reduce((acc, operation) =>{
        if(operation.type === "credit"){
            return acc + operation.amount
        }else{
            return acc - operation.amount
        }
    }, 0); // função que irá somar caso seja crédito e diminuir caso seja débito. e depois ira colocar tudo dentro de balance

    return balance
}

app.post("/account", (req, res)=>{ // rota de criação de conta

    const { cpf, name } = req.body; // body é o tipo de parametro utilizado para inserção de dados
    

    const customerAlreadyExists = customers.some(
        (customer) => customer.cpf === cpf
    ); // o some irá verificar se dentro do objeto Customers tem um cpf igual o cadastrado. Caso haja, retornará true.
    
    if(customerAlreadyExists){
        return res.status(400).json({ error: "Customer Already Exists" }) // caso o some seja verdadeiro, o programa vai dar erro
    }

    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    }); // o push vai pegar todas as informações colocadas no body dentro do array global de usuários

    return res.status(201).json({ message: "User created! "});

});

app.get("/statement", verifyIfExistsAccountCPF, (req, res) => { // rota de buscar extrato bancário

    const { customer } = req; // pegando o objeto customer dentro do middleare de verificação
    return res.json(customer.statement)
});

app.post("/deposit", verifyIfExistsAccountCPF, (req, res) => { // rota de criação de depósito
    const { description, amount } = req.body; // informações necessárias para depósito
 
    const { customer } = req;

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit" // crédito para depósito, débito para saque
    } 
    customer.statement.push(statementOperation) // pegando dados do statementOperation, description e amount, e acrescentando data e tipo

    return res.status(201).send("Deposit made succeffully")

});

app.post("/withdraw", verifyIfExistsAccountCPF, (req, res) => { // rota de realização de saque
    const { amount } = req.body; // quantia que será sacada
    const { customer } = req;

    const balance = getBalance(customer.statement); // customer.statement está entrando como parametro definido na funcção getBalance como statement

    if(balance < amount){
        return res.status(400).json({ error: "Insuficcient founds"})
    } // verificando se o balanço é menor que a quantia. Caso for, vai dar erro

    const statementOperation = {

        amount,
        created_at: new Date(),
        type: "debit" // crédito para depósito, débito para saque
    }  

    customer.statement.push(statementOperation);

    return res.json({ message: "Withdraw made succeffully"});
});

app.get("/statement/date", verifyIfExistsAccountCPF, (req, res) => { // rota de buscar extrato bancário pela data

    const { customer } = req; // pegando o objeto customer dentro do middleare de verificação
    const { date } = req.params; // pegando a data através do paramêtro passado na rota

    const dateFormat = new Date(date + " 00:00"); // formatando a data

    const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === new Date(dateFormat).toDateString()); // filtrando a data e fazendo as formatações necessárias

    return res.json(customer.statement)
});

app.put("/account", verifyIfExistsAccountCPF, (req, res) => { // rota para atualizar nomes de usuários
    const { name } = req.body;

    const { customer } = req;

    customer.name = name;

    return res.status(201).json({ message: customer })
});

app.get("/account", verifyIfExistsAccountCPF, (req, res) => { // rota para verificar customers
    const { customer } = req;

    return res.status(201).json({ message: customer })
});

app.delete("/account", verifyIfExistsAccountCPF, (req, res) => { // rota para deletar conta
    const { customer } = req;

    customers.splice(customer, 1);

    return res.status(200).json(customers)
});

app.get("/balance", verifyIfExistsAccountCPF, (req, res)=>{ // rota para busar balanço
    const { customer } = req;

    const Balance = getBalance(customer.statement);

    return res.status(201).json(Balance)
});




app.listen("8080", ()=>{
    console.log("Server is running");
});