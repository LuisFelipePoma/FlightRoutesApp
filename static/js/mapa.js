//<----------------------------------------------------------   Variables globales -------------------------------------------------------------------->//

// Variables para manejar la liberia D3.js
const { json, select, selectAll, geoOrthographic, geoPath,
    geoGraticule, transition } = d3;

// Variables para las medidas del navegador y del div donde estara el mapa
const width = document.querySelector("#mapa").clientWidth;
const height = document.querySelector("#mapa").clientHeight - 10;
const globeSize = {
    w: width * 0.90,
    h: height * 0.90,
}
// Variables necesarias para graficar en el svg el mapa
let globe, projection, path, graticule;

// Varibales para las rutas y aeropuertos
let nodes;

// Variables para guardar los dataSets
let geojson, airportjson;

// Variables pára crear elementos en el HTML
let infoPanel;

// Variables para las animaciones
let choice = false;
let isMouseDown = false, rotation = { x: 0, y: 0 };

// Variables para guardar los links de las datasets
const worldURL = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';
const airportsURL = 'https://raw.githubusercontent.com/LuisFelipePoma/DataSetForFlightRoutesApp/main/datasets/airports.json';

// <------------------------------------------------------------------- Verificacion de la lectura de los datos ------------------------------------>//


var promises = [json(worldURL), json(airportsURL)]
myDataPromises = Promise.all(promises)
myDataPromises.then(function (data) {
    init(data[0], data[1]);
})
myDataPromises.catch(function () {
    console.log('Something has gone wrong. No load Data.')
})


// <---------------------------------------------------------------- Funcion Init ---------------------------------------------------------------->//

const init = (worlds, airports,) => {
    geojson = worlds;
    airportjson = airports;
    drawGlobe();
    createNodes();
    drawGraticule();
    renderInfo();
    createHoverEffect();
    createSelectionEvent();
    createDraggingEvents();

}
// <------------------------------------------------------------------ Funciones ------------------------------------------------------------------>//

// ----------> Funcion que obtiene y asigna valores de aeropuertos -- se activa del evento creado en (createSelectionEvent) 

const getAirports = (e, flag) => {
    let airportsData = selectAll(`.${e.id}`); // Se obtiene los aeropuertos respectivos del pais seleccionado
    let lista_aeropuertos = []; // Se almacenara informacion de los aeropuertos
    let SelectDir; // Direccion del elemento que obtendra la informacion de los aeropuertos

    // Se recorre el JSON seleccionado y se obtiene la lista de aeropuertos
    airportsData["_groups"][0].forEach(function (e) { lista_aeropuertos.push(e) })
    // Mediante este if verificamos a que form se agregara la informacion
    if (flag === false) SelectDir = "#listOrigenes";
    else SelectDir = "#listDestinos";

    // Mediante un forEach se recorrera la lista y se ira agregando los aeropuertos  
    lista_aeropuertos.forEach((e) => {
        let elementos = e["__data__"] // variable que tendra la data (city,country,id,)
        let contenido; // variable que obtendra los datos especificos del aeropuerto
        let opt = document.createElement("option"); // variable que sera el elemento a insertar en el HTML

        // Se le asigna el nombre del aeropuerto y la ciudad en la que se encuentra
        contenido = elementos.airport_name + " (" + elementos.city + " )";

        // Se le asigna al elemento sus atributos text(muestra en pantalla) y value(el valor del elemento)
        opt.text = contenido;
        opt.value = elementos.id;
		// console.log(opt)
        // Finalmente se inserta en el form que direccione "formDir" y se inserta esa opcion
        document.querySelector(SelectDir).appendChild(opt);
    })
}

// ----------> Funcion que limpia las listas de Select -- es invocado en (createSelectionEvent)

const cleanLists = () => {
    // Se selecciona ambas listas Select y se limpia las opciones que existian
    document.querySelector("#listOrigenes").innerHTML = "";
    document.querySelector("#listDestinos").innerHTML = "";
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
        .rotate([0, 0])

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

// ----------> Funcion que genera los areopuertos(nodos) -- es invocado en init (main)

const createNodes = () => {
    nodes = globe.selectAll('g')
        .data(airportjson)
        .join('g')
        .append('g')
        .attr('class', (e) => { return `${e.country_code} airport` })
        .attr('transform', ({ lon, lat }) => `translate(${projection([lon, lat]).join(",")})`)

}

// ----------> Funcion que se le asigna los objetos a las respectivas variables globales que se usara el otra funciones -- es invocado en init (main)

const renderInfo = () => {
    infoPanel = select('#info') // "infoPanel" -- mostrara el pais que esta seleccionando
};

// ----------> Funcion que crea la animacion de cuando se pasa el mouse por el mapa -- es invocado en init (main)

const createHoverEffect = () => {

    globe
        .selectAll('.country')
        .on('mouseover', function (e, d) {
            const { name } = d.properties;
            infoPanel.html(`<h2>Pais : ${name} - ${d.id}</h2><hr>`)
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
                selectAll('.rutas').attr("d", function (d) { return path(d) })
                selectAll('.airport').attr('transform', ({ lon, lat }) => `translate(${projection([lon, lat]).join(",")})`)
            }
        })
};

// ----------> Funcion que permite seleccionar el pais y generar animaciones y activa otros eventos -- es invocado en init (main)
const createSelectionEvent = () => {

    globe
        .selectAll('.country')
        .on('mousedown', function (e) {
            let a = selectAll('.selected')
            let b = "";
            if (a.size() > 0) b = this.className.animVal
            if (a.size() < 2 && b.search('selected') == -1) {
                select(this).classed('noSelected', false);
                select(this).classed('selected', true);
                getAirports(this, choice);
                choice = true;

            }
            if (b.search('selected') != -1) {
                selectAll('.country').classed('selected', false);
                selectAll('.country').classed('noSelected', true);
                document.getElementById("sendData").disabled = true;
                cleanLists();
                choice = false;
            }
            if (a.size() + 1 == 2) document.getElementById("sendData").disabled = false;
        })
};

