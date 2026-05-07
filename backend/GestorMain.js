const Entorno = require('./Entorno');

class GestorMain
{
    constructor(ast, gestorDB)
    {
        this.ast = ast;
        this.errores = [];
        this.consola = "";
        this.detenerEjecucion = false;
        this.cicloActivo = false;
        this.db = gestorDB;
    }

    ejecutar()
    {
        if (!this.ast || this.ast.tipo !== "RAIZ") return;
        let entornoGlobal = new Entorno(null);
        if (this.ast.imports && this.ast.imports.length > 0) 
        {
            this.ast.imports.forEach(imp => this.consola += `Sistema: Importando archivo: ${imp}\n`);
        }
        if (this.ast.globales && this.ast.globales.length > 0) 
        {
            this.ast.globales.forEach(glob => this.manejarGlobal(glob, entornoGlobal));
        }
        if (this.ast.main)
        {
            this.consola += `Sistema: Iniciando bloque main...\n`;
            this.detenerEjecucion = false;
            this.manejarInstrucciones(this.ast.main.instrucciones, entornoGlobal);
        }
    }

    manejarGlobal(nodo, entorno)
    {
        if (nodo.tipo === "DECLARACION")
        {
            let valor = this.evaluarExpresion(nodo.valor, entorno);
            entorno.guardar(nodo.id, valor, nodo.tipo_dato);
            this.consola += `Global: Variable declarada: ${nodo.tipo_dato} ${nodo.id} = ${valor}\n`;
        } 
        else if (nodo.tipo === "DECLARACION_ARR")
        {
            let arr = new Array(nodo.size);
            if (nodo.valores && nodo.valores.length)
            {
                for (let i = 0; i < nodo.valores.length; i++)
                {
                    arr[i] = this.evaluarExpresion(nodo.valores[i], entorno);
                }
            }
            entorno.guardar(nodo.id, arr, "array");
            this.consola += `Global: Arreglo declarado: ${nodo.id} tamaño ${nodo.size}\n`;
        }
        else if (nodo.tipo === "DECLARACION_ARR_DB")
        {
            try 
            {
                let datosDB = this.db.seleccionarColumna(nodo.tabla, nodo.columna);
                entorno.guardar(nodo.id, datosDB, "array");
                this.consola += `Global: Arreglo desde BD: ${nodo.id} cargó ${datosDB.length} registros\n`;
            }
            catch (e) 
            {
                this.errores.push({ tipo: "Semántico", descripcion: e.message });
                entorno.guardar(nodo.id, [], "array");
            }
        }
        else if (nodo.tipo === "FUNCION")
        {
            entorno.guardar(nodo.id, nodo, "funcion");
            this.consola += `Global: Función guardada: ${nodo.id}\n`;
        }
    }

    manejarInstrucciones(instrucciones, entorno)
    {
        if (!instrucciones) return;
        for (let inst of instrucciones)
        {
            if (this.detenerEjecucion) break;
            switch (inst.tipo)
            {
                case "DECLARACION":
                    let valDec = this.evaluarExpresion(inst.valor, entorno);
                    entorno.guardar(inst.id, valDec, inst.tipo_dato);
                    this.consola += `Main: Variable local: ${inst.id} = ${valDec}\n`;
                    break;
                case "DECLARACION_ARR":
                    let arr = new Array(inst.size);
                    if (inst.valores && inst.valores.length)
                    {
                        for (let i = 0; i < inst.valores.length; i++)
                        {
                            arr[i] = this.evaluarExpresion(inst.valores[i], entorno);
                        }
                    }
                    entorno.guardar(inst.id, arr, "array");
                    this.consola += `Main: Arreglo local: ${inst.id}\n`;
                    break;
                case "DECLARACION_ARR_DB":
                    try 
                    {
                        let datosDB = this.db.seleccionarColumna(inst.tabla, inst.columna);
                        entorno.guardar(inst.id, datosDB, "array");
                        this.consola += `Main: Arreglo desde BD: ${inst.id} cargó ${datosDB.length} registros\n`;
                    }
                    catch (e) 
                    {
                        this.errores.push({ tipo: "Semántico", descripcion: e.message });
                        entorno.guardar(inst.id, [], "array");
                    }
                    break;
                case "ASIGNACION":
                    let valAsig = this.evaluarExpresion(inst.valor, entorno);
                    let varObj = entorno.obtener(inst.id);
                    varObj.valor = valAsig;
                    this.consola += `Main: Asignación: ${inst.id} = ${valAsig}\n`;
                    break;
                case "ASIGNACION_ARRAY":
                    let indice = this.evaluarExpresion(inst.indice, entorno);
                    let nuevoVal = this.evaluarExpresion(inst.valor, entorno);
                    let arreglo = entorno.obtener(inst.id).valor;
                    if (indice >= 0 && indice < arreglo.length) 
                    {
                        arreglo[indice] = nuevoVal;
                        this.consola += `Main: Arreglo[${indice}] = ${nuevoVal}\n`;
                    }
                    else
                    {
                        this.errores.push({ tipo: "Semántico", descripcion: `Índice ${indice} fuera de rango en arreglo ${inst.id}` });
                    }
                    break;
                case "POST_INCREMENTO":
                case "POST_DECREMENTO":
                    this.evaluarExpresion(inst, entorno);
                    break;
                case "INVOCAR_COMP":
                    this.consola += `Main: Invocando componente @${inst.id} con ${inst.argumentos.length} argumentos.\n`;
                    break;
                case "IF":
                    this.manejarIf(inst, entorno);
                    break;
                case "WHILE":
                    this.manejarWhile(inst, entorno);
                    break;
                case "DO_WHILE":
                    this.manejarDoWhile(inst, entorno);
                    break;
                case "FOR":
                    this.manejarFor(inst, entorno);
                    break;
                case "SWITCH":
                    this.manejarSwitch(inst, entorno);
                    break;
                case "BREAK":
                    this.detenerEjecucion = "break";
                    return;
                case "CONTINUE":
                    this.detenerEjecucion = "continue";
                    return;
                case "EXECUTE_DB":
                    this.manejarExecuteDB(inst, entorno);
                    break;
                case "LOAD":
                    this.manejarLoad(inst, entorno);
                    break;
                default:
                    this.consola += `Main: Instrucción desconocida: ${inst.tipo}\n`;
            }
        }
    }

    manejarIf(nodo, entorno)
    {
        let condicion = this.evaluarExpresion(nodo.condicion, entorno);
        if (condicion)
        {
            let entornoIf = new Entorno(entorno);
            this.manejarInstrucciones(nodo.inst_true, entornoIf);
        }
        else if (nodo.lista_elseif && nodo.lista_elseif.length)
        {
            let ejecutado = false;
            for (let elseif of nodo.lista_elseif)
            {
                let condicionElse = this.evaluarExpresion(elseif.condicion, entorno);
                if (condicionElse)
                {
                    let entornoElse = new Entorno(entorno);
                    this.manejarInstrucciones(elseif.instrucciones, entornoElse);
                    ejecutado = true;
                    break;
                }
            }
            if (!ejecutado && nodo.inst_false)
            {
                let entornoElse = new Entorno(entorno);
                this.manejarInstrucciones(nodo.inst_false, entornoElse);
            }
        }
        else if (nodo.inst_false)
        {
            let entornoElse = new Entorno(entorno);
            this.manejarInstrucciones(nodo.inst_false, entornoElse);
        }
    }

    manejarWhile(nodo, entorno)
    {
        let breakAnterior = this.detenerEjecucion;
        let frenoEmergencia = 0;
        while (this.evaluarExpresion(nodo.condicion, entorno))
        {
            if (frenoEmergencia++ > 1000)
            {
                this.errores.push({ tipo: "Semántico", descripcion: "Loop infinito detectado en While." });
                this.consola += "Sistema: Alerta - Loop infinito detenido por seguridad.\n";
                break;
            }
            this.detenerEjecucion = false;
            let entornoWhile = new Entorno(entorno);
            this.manejarInstrucciones(nodo.instrucciones, entornoWhile);
            if (this.detenerEjecucion)
            {
                if (this.detenerEjecucion === "break") break;
                if (this.detenerEjecucion === "continue") continue;
            }
        }
        this.detenerEjecucion = breakAnterior;
    }

    manejarDoWhile(nodo, entorno)
    {
        let breakAnterior = this.detenerEjecucion;
        let frenoEmergencia = 0;
        do
        {
            if (frenoEmergencia++ > 1000)
            {
                this.errores.push({ tipo: "Semántico", descripcion: "Loop infinito detectado en Do-While." });
                this.consola += "Sistema: Alerta - Loop infinito detenido por seguridad.\n";
                break;
            }
            this.detenerEjecucion = false;
            let entornoDo = new Entorno(entorno);
            this.manejarInstrucciones(nodo.instrucciones, entornoDo);
            if (this.detenerEjecucion === "break") break;
            if (this.detenerEjecucion === "continue") continue;
        }
        while (this.evaluarExpresion(nodo.condicion, entorno));
        this.detenerEjecucion = breakAnterior;
    }

    manejarFor(nodo, entorno)
    {
        let entornoFor = new Entorno(entorno);
        if (nodo.inicializacion)
        {
            if (nodo.inicializacion.tipo === "DECLARACION")
            {
                let val = this.evaluarExpresion(nodo.inicializacion.valor, entornoFor);
                entornoFor.guardar(nodo.inicializacion.id, val, nodo.inicializacion.tipo_dato);
            }
            else if (nodo.inicializacion.tipo === "ASIGNACION")
            {
                let val = this.evaluarExpresion(nodo.inicializacion.valor, entornoFor);
                let varObj = entornoFor.obtener(nodo.inicializacion.id);
                varObj.valor = val;
            }
        }
        let breakAnterior = this.detenerEjecucion;
        let frenoEmergencia = 0;
        while (this.evaluarExpresion(nodo.condicion, entornoFor))
        {
            if (frenoEmergencia++ > 1000)
            {
                this.errores.push({ tipo: "Semántico", descripcion: "Loop infinito detectado en For." });
                this.consola += "Sistema: Alerta - Loop infinito detenido por seguridad.\n";
                break;
            }
            this.detenerEjecucion = false;
            let entornoBody = new Entorno(entornoFor);
            this.manejarInstrucciones(nodo.instrucciones, entornoBody);
            if (this.detenerEjecucion === "break") break;
            if (this.detenerEjecucion === "continue")
            {
                if (nodo.actualizacion)
                {
                    this.evaluarExpresion(nodo.actualizacion, entornoFor);
                }
                continue;
            }
            if (nodo.actualizacion)
            {
                this.evaluarExpresion(nodo.actualizacion, entornoFor);
            }
        }
        this.detenerEjecucion = breakAnterior;
    }

    manejarSwitch(nodo, entorno)
    {
        let valor = this.evaluarExpresion(nodo.expresion, entorno);
        let ejecutado = false;
        for (let caso of nodo.casos)
        {
            let valCaso = this.evaluarExpresion(caso.valor, entorno);
            if (valor === valCaso)
            {
                let entornoSwitch = new Entorno(entorno);
                this.manejarInstrucciones(caso.instrucciones, entornoSwitch);
                ejecutado = true;
                break;
            }
        }
        if (!ejecutado && nodo.default)
        {
            let entornoDefault = new Entorno(entorno);
            this.manejarInstrucciones(nodo.default, entornoDefault);
        }
    }

    manejarExecuteDB(nodo, entorno)
    {
        let idcondicion = this.evaluarExpresion(nodo.condicion_id, entorno);
        let valoresUpdate = {};
        
        nodo.asignaciones.forEach(asig => 
        {
            valoresUpdate[asig.columna] = this.evaluarExpresion(asig.valor, entorno);
        });

        try 
        {
            this.db.actualizar(nodo.tabla, valoresUpdate, idcondicion);
            this.consola += `DB: Ejecutado en tabla ${nodo.tabla} SET ${JSON.stringify(valoresUpdate)} WHERE id = ${idcondicion}\n`;
        }
        catch (e) 
        {
            this.errores.push({ tipo: "Semántico", descripcion: e.message });
        }
    }

    manejarLoad(nodo, entorno)
    {
        let ruta = this.evaluarExpresion(nodo.ruta, entorno);
        this.consola += `Sistema: Cargando archivo ${ruta}\n`;
    }

    evaluarExpresion(expr, entorno)
    {
        if (expr === null || expr === undefined) return null;
        if (typeof expr === 'number' || typeof expr === 'string' || typeof expr === 'boolean')
        {
            return expr;
        }
        if (expr.tipo === "VARIABLE" || expr.tipo === "VAR_DINAMICA")
        {
            try
            {
                return entorno.obtener(expr.id).valor;
            }
            catch (e)
            {
                this.errores.push({ tipo: "Semántico", descripcion: e.message });
                return null;
            }
        }
        if (expr.tipo === "ACCESO_ARR")
        {
            let arreglo = this.evaluarExpresion({ tipo: "VARIABLE", id: expr.id }, entorno);
            let indice = this.evaluarExpresion(expr.indice, entorno);
            if (Array.isArray(arreglo) && indice >= 0 && indice < arreglo.length)
            {
                return arreglo[indice];
            }
            else
            {
                this.errores.push({ tipo: "Semántico", descripcion: `Índice ${indice} inválido en arreglo ${expr.id}` });
                return null;
            }
        }
        if (expr.tipo === "OPERACION")
        {
            let izq = this.evaluarExpresion(expr.izq, entorno);
            let der = this.evaluarExpresion(expr.der, entorno);
            switch (expr.operador)
            {
                case "+": return izq + der;
                case "-": return izq - der;
                case "*": return izq * der;
                case "/": return der !== 0 ? izq / der : (this.errores.push({ tipo: "Semántico", descripcion: "División por cero" }), 0);
                case "%": return izq % der;
                case "==": return izq === der;
                case "!=": return izq !== der;
                case "<": return izq < der;
                case ">": return izq > der;
                case "<=": return izq <= der;
                case ">=": return izq >= der;
                case "&&": return izq && der;
                case "||": return izq || der;
                default: return null;
            }
        }
        if (expr.tipo === "UNARIO")
        {
            let val = this.evaluarExpresion(expr.valor, entorno);
            if (expr.operador === "-") return -val;
            if (expr.operador === "!") return !val;
            return val;
        }
        if (expr.tipo === "POST_INCREMENTO")
        {
            let varObj = entorno.obtener(expr.id);
            let original = varObj.valor || 0;
            varObj.valor = original + 1;
            return original;
        }
        if (expr.tipo === "POST_DECREMENTO")
        {
            let varObj = entorno.obtener(expr.id);
            let original = varObj.valor || 0;
            varObj.valor = original - 1;
            return original;
        }
        if (expr.tipo === "ASIGNACION")
        {
            let val = this.evaluarExpresion(expr.valor, entorno);
            let varObj = entorno.obtener(expr.id);
            varObj.valor = val;
            return val;
        }
        return null;
    }
}

module.exports = GestorMain;