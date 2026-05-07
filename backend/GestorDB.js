class GestorDB
{
    constructor()
    {
        this.errores = [];
        this.tablas = new Map(); 
    }

    ejecutar(ast)
    {
        if (!ast) return;
        this.errores = []; 
        ast.forEach(instruccion => 
        {
            if (instruccion.tipo === "ERROR")
            {
                this.errores.push({tipo: instruccion.clase, lexema: instruccion.lexema, linea: instruccion.linea, descripcion: instruccion.clase === "Léxico" ? "No se reconoce el símbolo" : "Instrucción mal escrita" });
            }
            else if (instruccion.tipo === "CREAR_TABLA")
            {
                try { this.crearTabla(instruccion.tabla, instruccion.columnas); } 
                catch (error) { this.errores.push({ tipo: "Semántico", lexema: instruccion.tabla, linea: instruccion.linea, descripcion: error.message }); }
            }
            else if (instruccion.tipo === "INSERTAR")
            {
                try { this.insertar(instruccion.tabla, instruccion.valores); } 
                catch (error) { this.errores.push({ tipo: "Semántico", lexema: instruccion.tabla, linea: instruccion.linea, descripcion: error.message }); }
            }
            else if (instruccion.tipo === "ACTUALIZAR")
            {
                try { this.actualizar(instruccion.tabla, instruccion.valores, instruccion.idCond); } 
                catch (error) { this.errores.push({ tipo: "Semántico", lexema: instruccion.tabla, linea: instruccion.linea, descripcion: error.message }); }
            }
            else if (instruccion.tipo === "ELIMINAR") 
            {
                try { this.eliminar(instruccion.tabla, instruccion.idCond); } 
                catch (error) { this.errores.push({ tipo: "Semántico", lexema: instruccion.tabla, linea: instruccion.linea, descripcion: error.message }); }
            }
            else if (instruccion.tipo === "SELECCIONAR") 
            {
                try { this.seleccionarColumna(instruccion.tabla, instruccion.columna); } 
                catch (error) { this.errores.push({ tipo: "Semántico", lexema: instruccion.tabla, linea: instruccion.linea, descripcion: error.message }); }
            }
        });
    }

    crearTabla(nombre, columnasDef)
    {
        if (this.tablas.has(nombre)) throw new Error(`La tabla '${nombre}' ya existe.`);
        let columnas = new Map();
        if (columnasDef)
        {
            for (let col of columnasDef) 
            {
                columnas.set(col.id, col.tipo_dato);
            }
        }
        if (!columnas.has('id')) columnas.set('id', 'int');
        this.tablas.set(nombre, { columnas, datos: [] });
        return true;
    }

    insertar(tabla, valores)
    {
        if (!this.tablas.has(tabla)) throw new Error(`La tabla '${tabla}' no existe.`);
        let registro = { id: 0 };
        let columnaMap = this.tablas.get(tabla).columnas;
        for (let [columna, val] of Object.entries(valores)) 
        {
            if (!columnaMap.has(columna)) throw new Error(`La columna '${columna}' no existe en la tabla '${tabla}'.`);
            registro[columna] = val;
        }
        let maxId = 0;
        for (let row of this.tablas.get(tabla).datos) 
        {
            if (row.id > maxId) maxId = row.id;
        }
        registro.id = maxId + 1;
        this.tablas.get(tabla).datos.push(registro);
        return registro.id;
    }

    actualizar(tabla, valores, idCond)
    {
        if (!this.tablas.has(tabla)) throw new Error(`La tabla '${tabla}' no existe.`);
        let datos = this.tablas.get(tabla).datos;
        let indice = datos.findIndex(row => row.id === idCond);
        if (indice === -1) throw new Error(`El registro con id ${idCond} no fue encontrado.`);
        for (let [columna, val] of Object.entries(valores)) 
        {
            if (!this.tablas.get(tabla).columnas.has(columna)) throw new Error(`La columna '${columna}' no existe.`);
            datos[indice][columna] = val;
        }
        return true;
    }

    eliminar(tabla, idCond)
    {
        if (!this.tablas.has(tabla)) throw new Error(`La tabla '${tabla}' no existe.`);
        let datos = this.tablas.get(tabla).datos;
        let indice = datos.findIndex(row => row.id === idCond);
        if (indice === -1) throw new Error(`El registro con id ${idCond} no fue encontrado.`);
        datos.splice(indice, 1);
        return true;
    }

    seleccionarColumna(tabla, columna)
    {
        if (!this.tablas.has(tabla)) throw new Error(`La tabla '${tabla}' no existe.`);
        if (!this.tablas.get(tabla).columnas.has(columna)) throw new Error(`La columna '${columna}' no existe.`);
        return this.tablas.get(tabla).datos.map(row => row[columna]);
    }
}

module.exports = GestorDB;