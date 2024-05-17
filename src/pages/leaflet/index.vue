<template>
    <div id="player2d"></div>
</template>

<script setup>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'
import '@supermap/iclient-leaflet';
import { onMounted } from 'vue';

const setmap = () => {
    var res = [
        22.656185037721528,
        11.328092518860764,
        5.664046259430382,
        2.832023129715191,
        1.4160115648575955,
        0.7080057824287977,
        0.3540028912143989,
        0.17700144560719944];
    proj4.defs("116", "+proj=tmerc +lat_0=0 +lon_0=116 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs");
    var map = L.map('player2d', {
        center: [39.065867, 115.926227],
        maxZoom: 8,
        zoom: 3,
        crs: new L.Proj.CRS("116",
            {
                origin: [433547.7721070266, 4376643.030293404],
                resolutions: res,
                bounds: L.bounds([489733.9807778802, 4322929.342344743], [496305.1536343255, 4327199.498443375])
            })
    });

    new L.supermap.WMTSLayer("https://gw.xaxcsz.com:8085/wmts/wmts100",
        {
            layer: "容东深色系公共管理专题地图",
            style: "default",
            tilematrixSet: "Custom_容东深色系公共管理专题地图",
            format: "image/png",
            requestEncoding: 'REST',
        }
    ).addTo(map);

    window.map = map
}
const addMark = () => {
    map.on('click', function (e) {
        // e.latlng 包含点击位置的经纬度信息
        var lat = e.latlng.lat;
        var lng = e.latlng.lng;

        // 显示点击的坐标
        // alert("你点击了位置: " + lat + ", " + lng);
        console.log(`[${lat}, ${lng}]`);

        // 或者在地图上添加一个标记来表示点击的位置
        // L.marker([lat, lng]).addTo(map);
        L.marker([lat, lng], {icon: L.divIcon({html: '<div>123</div>'})}).addTo(map);
        
    });
}

const addMarkList = () => {
    const list = [
        [39.067654981218645, 115.92052827456166],
        [39.045719588684086, 115.92526359332666],
        [39.06032267813359, 115.94592735054404],
        [39.0506911698327, 115.88953278179149],
    ]
    list.forEach(item => {
        // L.marker(item, {icon: L.divIcon({html: '<div>123</div>'})}).addTo(map);
        let mark = L.marker(item).addTo(map)
        // mark.bindPopup("<b>Hello world!</b><br>I am a popup.").openPopup();
    })
}

onMounted(() => {
    setmap()
    addMarkList()
})
</script>

<style scoped>
#player2d {
    width: 100vw;
    height: 100vh;
}
</style>