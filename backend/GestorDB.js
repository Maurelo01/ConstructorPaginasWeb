class GestorDB
{
    constructor(ast, erroresJison)
    {
        this.ast = ast;
        this.errores = [];
        this.estadoTablas = new Map();
    }

    ejecutar()
    {
        if (this.errores.length > 0) return;
        this.ast.forEach(instruccion => 
        {
            if (instruccion.tipo === "ERROR")
            {
                this.errores.push({tipo: instruccion.clase, lexema: instruccion.lexema, linea: instruccion.linea,
                descripcion: instruccion.clase === "Léxico" ? "No se reconoce el símbolo" : "Instrucción mal escrita" });
            }
            else if (instruccion.tipo === "CREAR_TABLA")
            {
                if (this.estadoTablas.has(instruccion.tabla))
                {
                    this.errores.push({ tipo: "Semántico", lexema: instruccion.tabla, linea: instruccion.linea,
                    descripcion: `La tabla '${instruccion.tabla}' ya existe.`});
                }
                else
                {
                    this.estadoTablas.set(instruccion.tabla,{columnas: instruccion.columnas, datos: [] });
                }
            }
            else if (instruccion.tipo === "ELIMINAR") 
            {
            }
        });
    }
}
module.exports = GestorDB;