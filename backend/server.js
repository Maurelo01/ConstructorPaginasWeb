const express = require('express');
const cors = require('cors');
const parserDB = require('./gramatica'); 
const parserEstilos = require('./estilos'); 
const GestorEstilos = require('./GestorEstilos');
const GestorDB = require('./GestorDB');
const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

app.post('/api/ejecutar-db', (req, res) => 
{
    const { codigoDB } = req.body;
    try 
    {
        const ast = parserDB.parse(codigoDB);
        const gestor = new GestorDB(ast);
        gestor.ejecutar();
        res.json({ exito: gestor.errores.length === 0, errores: gestor.errores, ast: ast, estadoDB: Array.from(gestor.estadoTablas.keys())});
    }
    catch (error)
    {
        res.status(500).json({ exito: false, errores: [{ tipo: 'Fatal', descripcion: error.message }] });
    }
});

app.post('/api/ejecutar-estilos', (req, res) =>
{
    const { codigoEstilos } = req.body;
    try
    {
        const ast = parserEstilos.parse(codigoEstilos);
        const gestor = new GestorEstilos(ast);
        gestor.ejecutar();
        res.json({ exito: gestor.errores.length === 0, errores: gestor.errores, estilos: gestor.estilosHechos });
    }
    catch (error)
    {
        res.status(500).json({ exito: false, errores: [{ tipo: 'Fatal', descripcion: error.message }] });
    }
});

app.listen(PORT, () =>
{
    console.log(`Servidor YFERA corriendo en http://localhost:${PORT}`);
});