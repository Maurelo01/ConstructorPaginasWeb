const Entorno = require('./Entorno');

class GestorComponentes
{
    constructor(ast)
    {
        this.ast = ast;
        this.errores = [];
        this.resultadoGenerado = ""; 
    }

    ejecutar()
    {
        if (!this.ast || this.ast.tipo !== "RAIZ_COMPONENTES") return;
        let entorno = new Entorno(null);
        entorno.guardar("$opcion", "b", "string");
        entorno.guardar("$lista", ["Manzana", "Pera", "Uva"], "array");
        if (this.ast.componentes && this.ast.componentes.length > 0)
        {
            this.ast.componentes.forEach(nodo =>
            {
                this.resultadoGenerado += this.manejarNodo(nodo, entorno);
            });
        }
    }

    manejarNodo(nodo, entorno)
    {
        if (!nodo) return "";
        switch (nodo.tipo)
        {
            case "COMPONENTE":
                return this.manejarComponente(nodo, entorno);
            case "ERROR":
                return this.manejarError(nodo);
            case "ETIQUETA":
                return this.manejarEtiqueta(nodo, entorno);
            case "IF":
                return this.manejarIf(nodo, entorno);
            case "SECCION":
                return this.manejarSeccion(nodo, entorno);
            case "IMAGEN":
                return this.manejarImagen(nodo, entorno);
            case "FORMULARIO":
                return this.manejarFormulario(nodo, entorno);
            case "TEXTO":
                return this.manejarTexto(nodo, entorno);
            case "FOR_EACH":
                return this.manejarForEach(nodo, entorno);
            case "SWITCH":
                return this.manejarSwitch(nodo, entorno);
            default:
                return "";
        }
    }

    obtenerValor(nodoValor, entorno)
    {
        if (typeof nodoValor === 'string' || typeof nodoValor === 'number' || typeof nodoValor === 'boolean')
        {
            return nodoValor;
        }
        if (nodoValor && nodoValor.tipo === "VARIABLE")
        {
            try
            {
                let variable = entorno.obtener(nodoValor.id);
                return variable.valor;
            }
            catch (error)
            {
                this.errores.push({ tipo: "Semántico", lexema: nodoValor.id, linea: nodoValor.linea || 0, descripcion: error.message });
                return null;
            }
        }
        return null;
    }

    evaluarCondicion(nodoCondicion, entorno)
    {
        if (nodoCondicion.valor !== undefined)
        {
            return nodoCondicion.valor;
        }
        let izquierda = this.obtenerValor(nodoCondicion.izq, entorno);
        let derecha = this.obtenerValor(nodoCondicion.der, entorno);
        if (izquierda === null || derecha === null) return false;
        if (nodoCondicion.operador === "==")
        {
            return izquierda === derecha;
        }
        else if (nodoCondicion.operador === "!=")
        {
            return izquierda !== derecha;
        }
        return false;
    }

    manejarComponente(nodo, entorno)
    {
        let html = "";
        if (nodo.elementos && nodo.elementos.length > 0)
        {
            nodo.elementos.forEach(elem =>
            {
                html += this.manejarNodo(elem, entorno);
            });
        }
        return html;
    }

    manejarIf(nodo, entorno)
    {
        let html = "";
        let condicionCumplida = false;
        if (this.evaluarCondicion(nodo.condicion, entorno))
        {
            condicionCumplida = true;
            nodo.inst_true.forEach(inst => { html += this.manejarNodo(inst, entorno); });
        } 
        else if (nodo.lista_elseif && nodo.lista_elseif.length > 0)
        {
            for (let bloqueElseIf of nodo.lista_elseif)
            {
                if (this.evaluarCondicion(bloqueElseIf.condicion, entorno))
                {
                    condicionCumplida = true;
                    bloqueElseIf.instrucciones.forEach(inst => { html += this.manejarNodo(inst, entorno); });
                    break;
                }
            }
        }
        if (!condicionCumplida && nodo.inst_false)
        {
            nodo.inst_false.forEach(inst =>{ html += this.manejarNodo(inst, entorno); });
        }
        return html;
    }

    manejarError(nodo)
    {
        this.errores.push({ tipo: nodo.clase, lexema: nodo.lexema, linea: nodo.linea, descripcion: nodo.clase === "Léxico" ? "Símbolo no reconocido" : "Error de sintaxis" });
        return "";
    }

    manejarEtiqueta(nodo, entorno)
    {
        let html = `<${nodo.nombre}`;
        if (nodo.atributos && nodo.atributos.length > 0)
        {
            nodo.atributos.forEach(attr => { html += ` ${attr.nombre}="${attr.valor}"`; });
        }
        if (nodo.hijos && nodo.hijos.length > 0)
        {
            html += ">";
            nodo.hijos.forEach(hijo => { html += this.manejarNodo(hijo, entorno); });
            html += `</${nodo.nombre}>`;
        }
        else
        {
            html += " />";
        }
        return html;
    }

    manejarTexto(nodo, entorno)
    {
        let texto = nodo.valor;
        let resultado = "";
        let i = 0;
        while (i < texto.length)
        {
            if (texto[i] === '$')
            {
                let nombreVar = "$";
                i++;
                while (i < texto.length && ((texto[i] >= 'a' && texto[i] <= 'z') || (texto[i] >= 'A' && texto[i] <= 'Z') || (texto[i] >= '0' && texto[i] <= '9') || texto[i] === '_')) 
                {
                    nombreVar += texto[i];
                    i++;
                }
                if (nombreVar === "$")
                {
                    resultado += "$";
                }
                else
                {
                    try
                    {
                        let variable = entorno.obtener(nombreVar);
                        resultado += variable.valor;
                    }
                    catch (error)
                    {
                        resultado += nombreVar; 
                    }
                }
            }
            else
            {
                resultado += texto[i];
                i++;
            }
        }
        return resultado + "\n";
    }

    manejarSeccion(nodo, entorno)
    {
        let clases = (nodo.estilos || []).join(" ");
        let html = `<div class="${clases}">\n`;
        
        if (nodo.hijos && nodo.hijos.length > 0)
        {
            nodo.hijos.forEach(hijo => { html += this.manejarNodo(hijo, entorno); });
        }
        html += `</div>\n`;
        return html;
    }

    manejarImagen(nodo, entorno)
    {
        let clases = (nodo.estilos || []).join(" ");
        let html = "";
        if (nodo.urls && nodo.urls.length > 0)
        {
            nodo.urls.forEach(urlObj =>
            {
                let src = (urlObj.tipo === "VARIABLE") ? this.obtenerValor(urlObj, entorno) : urlObj;
                html += `<img class="${clases}" src="${src}" alt="Imagen" />\n`;
            });
        }
        return html;
    }

    manejarFormulario(nodo, entorno)
    { 
        let clases = (nodo.estilos || []).join(" ");
        let html = `<form class="${clases}">\n`;
        if (nodo.elementos && nodo.elementos.length > 0)
        {
            nodo.elementos.forEach(elem =>
            {
                if (elem.tipo === "INPUT")
                {
                    html += this.manejarInput(elem, entorno);
                }
                else
                {
                    html += this.manejarNodo(elem, entorno);
                }
            });
        }
        if (nodo.submit)
        {
            let submitClases = (nodo.submit.estilos || []).join(" ");
            let label = "Enviar";
            let action = "";
            if (nodo.submit.atributos)
            {
                nodo.submit.atributos.forEach(attr =>
                {
                    if (attr.nombre === "label") label = attr.valor;
                    if (attr.nombre === "function") action = attr.valor;
                });
            }
            html += `<button type="submit" class="${submitClases}" onclick="${action}">${label}</button>\n`;
        }
        html += `</form>\n`;
        return html;
    }

    manejarInput(nodo, entorno)
    {
        let clases = (nodo.estilos || []).join(" ");
        let tipoHtml = nodo.subtipo === "number" ? "number" : (nodo.subtipo === "bool" ? "checkbox" : "text");
        let labelStr = "";
        let inputHtml = `<input type="${tipoHtml}" class="${clases}"`;
        if (nodo.atributos)
        {
            nodo.atributos.forEach(attr =>
            {
                let val = attr.valor;
                if (val && val.tipo === "VARIABLE")
                {
                    val = this.obtenerValor(val, entorno) || "";
                }
                if (attr.nombre === "label")
                {
                    labelStr = `<label>${val}</label>\n`;
                }
                else if (attr.nombre === "value")
                {
                    if (tipoHtml === "checkbox" && val === true)
                    {
                        inputHtml += ` checked`;
                    }
                    else if (tipoHtml !== "checkbox")
                    {
                        inputHtml += ` value="${val}"`;
                    }
                }
                else
                {
                    inputHtml += ` ${attr.nombre}="${val}"`;
                }
            });
        }
        inputHtml += ` />\n`;
        return `<div>\n  ${labelStr}  ${inputHtml}</div>\n`;
    }
    
    manejarForEach(nodo, entorno) 
    {
        let html = "";
        if (!nodo.pares || nodo.pares.length === 0) return html;
        let par = nodo.pares[0];
        let nombreItem = par.variable_array;
        let nombreLista = par.variable_acceso;
        let arreglo = [];
        try
        {
            let varLista = entorno.obtener(nombreLista);
            if (varLista && Array.isArray(varLista.valor))
            {
                arreglo = varLista.valor;
            }
        }
        catch (error) {}
        if (arreglo.length === 0)
        {
            if (nodo.vacio && nodo.vacio.length > 0)
            {
                nodo.vacio.forEach(inst => { html += this.manejarNodo(inst, entorno); });
            }
            return html;
        }
        arreglo.forEach((elemento, index) =>
        {
            
            const Entorno = require('./Entorno');
            let entornoLocal = new Entorno(entorno);
            entornoLocal.guardar(nombreItem, elemento, "any");
            if (nodo.track_index)
            {
                entornoLocal.guardar(nodo.track_index, index, "number");
            }
            nodo.instrucciones.forEach(inst => { html += this.manejarNodo(inst, entornoLocal); });
        });
        return html;
    }

    manejarSwitch(nodo, entorno)
    {
        let html = "";
        let valorExpresion = this.obtenerValor(nodo.expresion, entorno);
        let casoEjecutado = false;
        if (nodo.casos && nodo.casos.length > 0)
        {
            for (let caso of nodo.casos)
            {
                let valorCaso = this.obtenerValor(caso.valor, entorno);
                if (valorCaso === valorExpresion)
                {
                    caso.instrucciones.forEach(inst => { html += this.manejarNodo(inst, entorno); });
                    casoEjecutado = true;
                    break;
                }
            }
        }
        if (!casoEjecutado && nodo.default)
        {
            nodo.default.forEach(inst => { html += this.manejarNodo(inst, entorno); });
        }
        return html;
    }
}

module.exports = GestorComponentes;