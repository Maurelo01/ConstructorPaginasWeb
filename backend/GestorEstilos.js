class GestorEstilos 
{
    constructor(ast)
    {
        this.ast = ast;
        this.errores = [];
        this.estilosHechos = {};
    }

    ejecutar() 
    {
        this.procesarInstrucciones(this.ast, {});
    }

    procesarInstrucciones(instrucciones, entorno)
    {
        if (!instrucciones) return;
        instrucciones.forEach(instruccion => 
        {
            if (instruccion.tipo === "ERROR")
            {
                this.errores.push({tipo: instruccion.clase, lexema: instruccion.lexema, linea: instruccion.linea, columna: instruccion.columna, descripcion: instruccion.clase === "Léxico" ? "Símbolo no reconocido" : "Instrucción o bloque de estilos mal escritos"});
            }
            else if (instruccion.tipo === "REGLA")
            {
                let selectorFinal = this.cambiarVariables(instruccion.selector, entorno);
                let propiedadesResueltas = this.transformarPropiedades(instruccion.propiedades, entorno);
                this.estilosHechos[selectorFinal] = {extiende: instruccion.extiende, propiedades: propiedadesResueltas};
            }
            else if (instruccion.tipo === "FOR") 
            {
                let inicio = instruccion.inicio;
                let fin = instruccion.rango === "through" ? instruccion.fin : instruccion.fin - 1;
                for (let i = inicio; i <= fin; i++) 
                {
                    let nuevoEntorno = { ...entorno };
                    nuevoEntorno[instruccion.variable] = i;
                    this.procesarInstrucciones(instruccion.instrucciones, nuevoEntorno);
                }
            }
        });
    }

    cambiarVariables(cadena, entorno)
    {
        let resultado = cadena;
        for (const [variable, valor] of Object.entries(entorno)) 
        {
            resultado = resultado.split(variable).join(valor);
        }
        return resultado;
    }

    transformarPropiedades(propiedades, entorno)
    {
        let resueltas = {};
        if (!propiedades) return resueltas;
        propiedades.forEach(propiedad =>
        {
            let valoresTexto = propiedad.valores.map(valor => 
            {
                if (valor.tipo === "VARIABLE") 
                {
                    return entorno[valor.id] !== undefined ? entorno[valor.id] : valor.id;
                }
                if (valor.tipo === "OPERACION")
                {
                    let izquierda = entorno[valor.izquierda] !== undefined ? entorno[valor.izquierda] : 0;
                    let derecha = valor.derecha;
                    switch (valor.operador)
                    {
                        case "+": return izquierda + derecha;
                        case "-": return izquierda - derecha;
                        case "*": return izquierda * derecha;
                        case "/": return derecha !== 0 ? izquierda / derecha : 0;
                        case "%": return derecha !== 0 ? izquierda % derecha : 0;
                        case "^": return Math.pow(izquierda, derecha);
                        default: return izquierda;
                    }
                }
                if (valor.tipo === "NUMERO") return valor.valor;
                if (valor.tipo === "MEDIDA") return valor.valor + valor.unidad;
                if (valor.tipo === "CADENA") return valor.valor;
                if (valor.tipo === "HEX") return valor.valor;
                if (valor.tipo === "FUNCION")
                {
                    return `${valor.nombre}(${valor.args[0][0].valor}, ${valor.args[1][0].valor}, ${valor.args[2][0].valor})`;
                }
                return "";
            });
            resueltas[propiedad.nombre] = valoresTexto.join(" ");
        });
        return resueltas;
    }
}
module.exports = GestorEstilos;
