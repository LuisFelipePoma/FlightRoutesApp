//<----------------------------------------------------------   Variables globales -------------------------------------------------------------------->//

// Variables para manejar la liberia D3.js
const { json, select, selectAll, geoOrthographic, geoPath,
    geoGraticule, geoMercator,transition } = d3;

// Variables para las medidas del navegador y del div donde estara el mapa
const width = document.querySelector("#mapa").clientWidth;
const height = document.querySelector("#mapa").clientHeight - 10;
const globeSize = {
    w: width * 0.90,
    h: height * 0.90,
}
// Variables necesarias para graficar en el svg el mapa
let globe, projection, path, graticule;

// Variables para guardar la data de la API
let pathsAPI;
// Variables para tener los datos resultantes de cada algoritmo
let djkPath, dfsPath, primPath;

// Variables para tener los aeropuertos del resultante de cada algoritmo (aeropuertos)
let djkNodes, dfsNodes, primNodes;

// Varibales para tener las rutas resultantes de cada algoritmo (aristas)
let djkRoutes, dfsRoutes, primRoutes;

// Variables para guardar los dataSets
let geojson, airportjson, routesjson;

// Variable para dibujar los nodos

let nodes;
// Variables pára crear elementos en el HTML
let infoPanel;

// Variables para las animaciones

let isMouseDown = false, rotation = { x: 0, y: 0 };

// Variables para guardar los links de las datasets
const worldURL = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';
const airportsURL = 'https://raw.githubusercontent.com/LuisFelipePoma/DataSetForFlightRoutesApp/main/datasets/airports.json';
const routesURL = 'https://raw.githubusercontent.com/LuisFelipePoma/DataSetForFlightRoutesApp/main/datasets/routes.json';

// <------------------------------------------------------------------- Verificacion de la lectura de los datos ------------------------------------>//


var promises = [json(worldURL), json(airportsURL), json(routesURL)]
myDataPromises = Promise.all(promises)
myDataPromises.then(function (data) {
    init(data[0], data[1], data[2]);
})
myDataPromises.catch(function () {
    console.log('Something has gone wrong. No load Data.')
})


// <---------------------------------------------------------------- Funcion Init ---------------------------------------------------------------->//

const init = (worldsData, airportsData, routesData) => {
	console.log("Iniciando")
    geojson = worldsData
    airportjson = airportsData
    routesjson = routesData
    generateGlobe();
    getDataPath()
    renderInfoAlgo();
    createHoverEffect()
    createDraggingEvents()
    createEventShow();
}
// <------------------------------------------------------------------ Funciones ------------------------------------------------------------------>//

// ----------> Funcion que agrupa las funciones que generan el mapa
const generateGlobe = () => {
    drawGlobe();
    drawGraticule();
}

// ----------> Funcion que agrupa las funciones para reiniciar el globo 
const updateGlove = () => {
    drawGlobe();
    drawGraticule();
    renderInfoAlgo();
    createHoverEffect()
    createDraggingEvents()
}

// ----------> Funcion que crea los eventos de los botones para mostrar las rutas y aeropuertos de cada algoritmo
const createEventShow = () => {
    document.getElementById("showDjk").addEventListener("click", (e) => {
        cleanAll();
        updateGlove();
        updateNodes(djkNodes, "djk_nodes")
        updateRoutes(djkRoutes, "djk_routes")
        createTextContent(djkNodes);
        console.log(globe)
    })
    document.getElementById("showDfs").addEventListener("click", (e) => {
        cleanAll();
        updateGlove();
        updateNodes(dfsNodes, "dfs_nodes")
        updateRoutes(dfsRoutes, "dfs_routes")
        createTextContent(dfsNodes);
    })
    document.getElementById("showPrim").addEventListener("click", (e) => {
        cleanAll();
        updateGlove();
        updateNodes(primNodes, "prim_nodes")
        updateRoutes(primRoutes, "prim_routes")
        createTextContent(primNodes);
    })
};

// ----------> Funcion para crear los datos de los aeropuertos en pantalla
const createTextContent = (data) => {
    let element = document.createElement("p");
    let content = ""
    let flag = false;
    data.forEach((e, index) => {
        content += e.city + " (" + e.country_code + ")" + " -> ";
        if (index > 125) { flag = true; return; }
    });
    if (flag == true) {
        element.textContent = "Este algoritmo recorre todos los aeropuertos del mundo hasta llegar a su destino. ";
    } else element.textContent = content + "Fin.";
    document.querySelector("#data_algorith").appendChild(element);
}

// ----------> Funcion que genera las projecciones y svg para el mapa -- es invocado en init (main) 
const drawGlobe = () => {
    // Se hace uso de las variables globales previamente creadas

    // Se asigna las medidas del mapa y crea el svg
    globe = select('#mapa')
        .append('svg')
        .attr('width', width)
        .attr('height', height)

    // Se asigna a la projeccion las medidas acordes al div del cual pertenece
    projection = geoOrthographic()
        .fitSize([globeSize.w, globeSize.h], geojson)
        .translate([height - width / 2, height / 2])

    // Se asigna al path la projeccion
    path = geoPath().projection(projection)

    // Se asignan la data del geojson y las clases para las animaciones
    globe
        .selectAll('path')
        .data(geojson.features)
        .enter().append('path')
        .attr('d', path)
        .attr('id', (e) => { return e.id })
        .attr('class', 'country noSelected selected howerOff howerPass')
        .classed('selected', false).classed('howerPass', false)

};

// ----------> Funcion que genera la reticula del mapa -- es invocado en init (main) 
const drawGraticule = () => {
    // A la variable global se le asigna d3.geoGraticule
    graticule = geoGraticule()

    // Se le inserta el path, la clase para los ajustes y la data mediante el atributo 'd' 
    globe
        .append('path')
        .attr('class', 'graticule')
        .attr('d', path(graticule()))
};

// ----------> Funcion que limpia las rutas y nodos en el svg (mapa) 
const cleanAll = () => {
    globe.selectAll('g').remove();
    var pathSet = globe.selectAll('path');
    pathSet["_groups"][0].forEach((e) => { e.remove(); })
    document.querySelector("#data_algorith").innerHTML = " ";
}

// ----------> Funcion que genera los areopuertos(nodos) -- es invocado en init (main)
const updateNodes = (algorithmData, classT) => {
    nodes = globe.selectAll('g')
        .data(algorithmData)
        .enter().append('g')
        .attr('class', `${classT} airport`)
        .attr('class', function (e, index) {
            if (index == 0) return `${classT} airport node_origin`
            else if (index == algorithmData.length - 1) return `${classT} airport node_destiny`
            else return `${classT} airport`
        })
        .attr('transform', ({ lon, lat }) => `translate(${projection([lon, lat]).join(",")})`)
        .append("circle")
        .attr('r', function (e, index) {
            if (index == 0 || index == algorithmData.length - 1) return "7.5"
            else return "5"
        })
}

// ----------> Funcion que genera las rutas de los aeropuertos(aristas) -- es invocado en init (main)
const updateRoutes = (algorithmData, classT) => {
    //Se asignan los valores determinados y clases
    globe.selectAll("myPath")
        .data(algorithmData)
        .enter()
        .append("path")
        .attr("class", `${classT} routes`)
        .attr("d", function (d) { return path(d) })
}

// ----------> Funcion que obtiene la data de la API y la convierte en informacion -- es invocado en init (main)
const getDataPath = () => {
    pathsAPI = document.querySelector("#pathsString").textContent;
    getDataDjk();
    getDataDfs();
    getDataPrim();
}

// ----------> Funciones que obtienen la data de las rutas y aeropuertos de cada algoritmo (djk -> Dijkstra, dfs -> (Depth Find Search), prim -> (Prim)) 
const getDataDjk = () => {
    [djkNodes, djkRoutes] = getJsonRoutesNodes("djk");
}
const getDataDfs = () => {
    [dfsNodes, dfsRoutes] = getJsonRoutesNodes("dfs");
}
const getDataPrim = () => {
    [primNodes, primRoutes] = getJsonRoutesNodes("prim");
}

// ----------> Funcion convierte la data obtenida en JSON -- es invocado en (getDataPath)
const getJsonRoutesNodes = (algorithm) => {
    let pathsString = JSON.parse(pathsAPI);
    let routesIds = pathsString[algorithm]
    let airports = [];
    // console.log(algorithm)
    // console.log(routesIds)
    routesIds = routesIds.reverse();

    for (let i = 0; i < routesIds.length; ++i) {
        let id = parseInt(routesIds[i]);
        let data = airportjson[id];
        airports.push(data);
    }
    console.log(airports)
    // Para hallar las coordenadas de las rutas a mostrar en pantalla
    let routes = []

    for (let i = 1; i < routesIds.length; ++i) {
        let content = { type: "LineString", coordinates: [[+airports[i - 1].lon, +airports[i - 1].lat], [+airports[i].lon, +airports[i].lat]] }
        routes.push(content)
    }
	console.log(routes)
    return [airports, routes]
}

// ----------> Funcion que se le asigna los objetos a las respectivas variables globales que se usara el otra funciones -- es invocado en init (main)
const renderInfoAlgo = () => {
    infoPanel = select('#info') // "infoPanel" -- mostrara el pais que esta seleccionando
    let contentOrigin = "<h4> Aeropuerto Origen:  " + djkNodes[0].airport_name + "  <span id='origin_legend'>■</span></h4>";
    let contentDestiny = "<h4>Aeropuerto Destino:  " + djkNodes[djkNodes.length - 1].airport_name + "  <span id='destiny_legend'>■</span></h4>";
    // Renderizar los aeropuertos origen y destino
    document.getElementById("origen_label").innerHTML = contentOrigin;
    document.getElementById("destino_label").innerHTML = contentDestiny;
};

// ----------> Funcion que crea la animacion de cuando se pasa el mouse por el mapa -- es invocado en init (main)
const createHoverEffect = () => {

    globe
        .selectAll('.country')
        .on('mouseover', function (e, d) {
            const { name } = d.properties
            infoPanel.html(`<h2>${name}</h2><hr>`)
            globe.selectAll('.country').classed('howerPass', false).classed('howerOff', true)
            select(this).classed('howerOff', false).classed("howerPass", true);
        })
        .on("mouseout", function (e, d) {
            globe.selectAll('.country').classed("howerPass", false).classed('howerOff', true)
        });
};

// ----------> Funcion que permite rotar el mapa -- es invocado en init (main)
const createDraggingEvents = () => {

    globe
        .on('mousedown', () => isMouseDown = true)
        .on('mouseup', () => isMouseDown = false)
        .on('mousemove', e => {

            if (isMouseDown) {
                const { movementX, movementY } = e

                rotation.x += movementX / 2
                rotation.y -= movementY / 2

                projection.rotate([rotation.x, rotation.y])
                selectAll('.country').attr('d', path)
                selectAll('.graticule').attr('d', path(graticule()))
                selectAll('.routes').attr("d", function (d) { return path(d) })
                selectAll('.airport').attr('transform', ({ lon, lat }) => `translate(${projection([lon, lat]).join(",")})`)
            }
        })
};
