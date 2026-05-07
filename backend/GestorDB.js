const Database = require('better-sqlite3');
const path = require('path');

class GestorDB
{
    constructor()
    {
        this.errores = [];
        const dbPath = path.join(__dirname, 'yfera.db');
        this.db = new Database(dbPath);
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
                try 
                {
                    this.crearTabla(instruccion.tabla, instruccion.columnas);
                } 
                catch (error)
                {
                    this.errores.push({ tipo: "Semántico", lexema: instruccion.tabla, linea: instruccion.linea, descripcion: error.message });
                }
            }
            else if (instruccion.tipo === "INSERTAR")
            {
                try
                {
                    this.insertar(instruccion.tabla, instruccion.valores);
                } 
                catch (error)
                {
                    this.errores.push({ tipo: "Semántico", lexema: instruccion.tabla, linea: instruccion.linea, descripcion: error.message });
                }
            }
            else if (instruccion.tipo === "ACTUALIZAR")
            {
                try
                {
                    this.actualizar(instruccion.tabla, instruccion.valores, instruccion.idCond);
                } 
                catch (error)
                {
                    this.errores.push({ tipo: "Semántico", lexema: instruccion.tabla, linea: instruccion.linea, descripcion: error.message });
                }
            }
            else if (instruccion.tipo === "ELIMINAR") 
            {
                try
                {
                    this.eliminar(instruccion.tabla, instruccion.idCond);
                } 
                catch (error)
                {
                    this.errores.push({ tipo: "Semántico", lexema: instruccion.tabla, linea: instruccion.linea, descripcion: error.message });
                }
            }
            else if (instruccion.tipo === "SELECCIONAR") 
            {
                try
                {
                    this.seleccionarColumna(instruccion.tabla, instruccion.columna);
                } 
                catch (error) 
                {
                    this.errores.push({ tipo: "Semántico", lexema: instruccion.tabla, linea: instruccion.linea, descripcion: error.message });
                }
            }
        });
    }

    reescribirTipo(tipo) 
    {
        switch(tipo.toLowerCase())
        {
            case 'int': return 'INTEGER';
            case 'float': return 'REAL';
            case 'string': 
            case 'char': return 'TEXT';
            case 'boolean': return 'INTEGER'; 
            default: return 'TEXT';
        }
    }

    crearTabla(nombre, columnasDef)
    {
        const tablaExiste = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(nombre);
        if (tablaExiste) throw new Error(`La tabla '${nombre}' ya existe.`);
        let definiciones = ["id INTEGER PRIMARY KEY AUTOINCREMENT"];
        if (columnasDef)
        {
            for (let col of columnasDef) 
            {
                if (col.id.toLowerCase() !== 'id')
                {
                    definiciones.push(`${col.id} ${this.reescribirTipo(col.tipo_dato)}`);
                }
            }
        }
        const sql = `CREATE TABLE ${nombre} (${definiciones.join(", ")})`;
        this.db.exec(sql);
        return true;
    }

    insertar(tabla, valores)
    {
        const columnas = Object.keys(valores);
        const placeholders = columnas.map(() => '?').join(', ');
        const data = Object.values(valores);
        const sql = `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${placeholders})`;
        try
        {
            const stmt = this.db.prepare(sql);
            const resultado = stmt.run(...data);
            return resultado.lastInsertRowid; 
        }
        catch (error)
        {
            if (error.message.includes('no such table')) throw new Error(`La tabla '${tabla}' no existe.`);
            if (error.message.includes('has no column')) throw new Error(`La columna no existe en la tabla '${tabla}'.`);
            throw error;
        }
    }

    actualizar(tabla, valores, idCond)
    {
        const columnas = Object.keys(valores);
        const setSql = columnas.map(col => `${col} = ?`).join(', ');
        const data = [...Object.values(valores), idCond];
        const sql = `UPDATE ${tabla} SET ${setSql} WHERE id = ?`;
        try
        {
            const stmt = this.db.prepare(sql);
            const resultado = stmt.run(...data);
            if (resultado.changes === 0) throw new Error(`El registro con id ${idCond} no fue encontrado.`);
            return true;
        }
        catch (error)
        {
            if (error.message.includes('no such table')) throw new Error(`La tabla '${tabla}' no existe.`);
            throw error;
        }
    }

    eliminar(tabla, idCond)
    {
        const sql = `DELETE FROM ${tabla} WHERE id = ?`;
        try
        {
            const stmt = this.db.prepare(sql);
            const resultado = stmt.run(idCond);
            if (resultado.changes === 0) throw new Error(`El registro con id ${idCond} no fue encontrado.`);
            return true;
        }
        catch (error)
        {
            if (error.message.includes('no such table')) throw new Error(`La tabla '${tabla}' no existe.`);
            throw error;
        }
    }

    seleccionarColumna(tabla, columna)
    {
        const sql = `SELECT ${columna} FROM ${tabla}`;
        try
        {
            const stmt = this.db.prepare(sql);
            const registros = stmt.all();
            return registros.map(reg => reg[columna]);
        }
        catch (error)
        {
            if (error.message.includes('no such table')) throw new Error(`La tabla '${tabla}' no existe.`);
            if (error.message.includes('no such column')) throw new Error(`La columna '${columna}' no existe.`);
            throw error;
        }
    }

    obtenerTablas()
    {
        const sql = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
        const tablas = this.db.prepare(sql).all();
        return tablas.map(t => t.name);
    }
}

module.exports = GestorDB;