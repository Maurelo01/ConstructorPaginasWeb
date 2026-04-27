class Entorno 
{
    constructor(padre = null)
    {
        this.variables = new Map();
        this.padre = padre;
    }

    guardar(id, valor, tipo)
    {
        this.variables.set(id, { valor, tipo });
    }

    obtener(id)
    {
        let actual = this;
        while (actual != null)
        {
            if (actual.variables.has(id))
            {
                return actual.variables.get(id);
            }
            actual = actual.padre;
        }
        throw new Error(`Semántico: La variable '${id}' no existe.`);
    }
}

module.exports = Entorno;