const express = require('express');
const cors = require('cors');
const parserDB = require('./gramatica'); 
const parserEstilos = require('./estilos'); 
const parserComponentes = require('./componentes');
const parserMain = require('./main');
const GestorEstilos = require('./GestorEstilos');
const GestorDB = require('./GestorDB');
const GestorComponentes = require('./GestorComponentes');
const GestorMain = require('./GestorMain');
const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());
const baseDeDatosGlobal = new GestorDB();

app.post('/api/ejecutar-db', (req, res) => 
{
    const { codigoDB } = req.body;
    try 
    {
        const ast = parserDB.parse(codigoDB);
        baseDeDatosGlobal.ejecutar(ast);
        res.json({ exito: baseDeDatosGlobal.errores.length === 0, errores: baseDeDatosGlobal.errores, ast: ast, estadoDB: baseDeDatosGlobal.obtenerTablas()});
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

app.post('/api/ejecutar-componentes', (req, res) =>
{
    const { codigoComponente } = req.body;
    try
    {
        const ast = parserComponentes.parse(codigoComponente);
        const gestor = new GestorComponentes(ast);
        gestor.ejecutar();
        res.json({ exito: gestor.errores.length === 0, htmlGenerado: gestor.resultadoGenerado, errores: gestor.errores, ast: ast });
    }
    catch (error)
    {
        res.status(500).json({ exito: false, error: error.message });
    }
});

app.post('/api/ejecutar-proyecto', (req, res) =>
{
    const { codigoPrincipal } = req.body;
    try
    {
        const ast = parserMain.parse(codigoPrincipal);
        const gestor = new GestorMain(ast, baseDeDatosGlobal);
        gestor.ejecutar();
        res.json({exito: gestor.errores.length === 0, consola: gestor.consola, errores: gestor.errores, ast: ast});
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