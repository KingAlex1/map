import './style.css'


var myMap,
    clusterer,
    balloons = [];

var getDate = function() {
    let date = new Date(),
        day = date.getDate(),
        month = date.getMonth() + 1,
        year = date.getFullYear(),
        hours = date.getHours(),
        minutes = date.getMinutes(),
        seconds = date.getSeconds();

    if (day < 10) day = '0' + day;
    if (month < 10) month = '0' + month;
    if (hours < 10) hours = '0' + hours;
    if (minutes < 10) minutes = '0' + minutes;
    if (seconds < 10) seconds = '0' + seconds;

    let now = year + '.' + month + '.' + day + ' ' + hours + ':' + minutes + ':' + seconds;

    return now;
}

ymaps.ready(init);

function init() {
    myMap = new ymaps.Map('map', {
        center: [55.753994, 37.622093],
        zoom: 9,
        controls: ['zoomControl'],

    });

    myMap.events.add('click', e => {
        var coords = e.get('coords');

        ymaps.geocode(coords)
            .then(res => {
                var object = res.geoObjects.get(0),
                    address = object.properties.get('text');

                myMap.balloon.open(coords, {
                    coords: coords,
                    address: address,
                    message: 'Отзывов пока нет...'
                }, {
                    layout: balloonTpl,
                    contentLayout: balloonContentTpl
                });
            });
    });

    var balloonTpl = ymaps.templateLayoutFactory.createClass(
        `<div class="desk-map">
            <div class="desk-head">                
                {{properties.data.address|default: address}}
                <div class="desk-map__close"></div>
            </div>
            <div class="desk-body">{% include options.contentLayout %}</div>
            <div class="desk-form">
                <h3>Ваш отзыв</h3>
                <form id="form">
                    <input type="text" name="name" id="name" placeholder="Ваше имя">
                    <input type="text" name="place" id="place" placeholder="Укажите место">
                    <textarea id="comment" rows="3" name="comment" placeholder="Поделитесь впечатлениями"></textarea>
                    <button id="addComment">Добавить</button>
                </form>
            </div>
        </div>` ,
        {
            build() {
                this.constructor.superclass.build.call(this);

                var closeBtn = document.querySelector('.desk-map__close'),
                    addComment = document.querySelector('#addComment');

                addComment.addEventListener('click', this.addReview.bind(this));
                closeBtn.addEventListener('click', this.closeBalloon.bind(this));
            },
            clear() {
                var closeBtn = document.querySelector('.desk-map__close'),
                    addComment = document.querySelector('#addComment');

                addComment.removeEventListener('click', this.addReview);
                closeBtn.removeEventListener('click', this.closeBalloon);
                this.constructor.superclass.clear.call(this);
            },
            closeBalloon(e) {
                e.preventDefault();

                this.events.fire('userclose');
            },
            addReview(e) {
                e.preventDefault();

                var name = document.getElementById('name'),
                    place = document.getElementById('place'),
                    comment = document.getElementById('comment'),
                    reviews = document.querySelector('.desk-body');

                if (name.value && place.value && comment.value) {
                    var tplElement = document.getElementById('balloonTpl'),
                        source = tplElement.innerHTML,
                        render = Handlebars.compile(source),
                        reviews = reviews.firstElementChild.firstElementChild,
                        coords = this.getData().properties ? this.getData().properties.getAll().data.coords : this.getData().coords,
                        address = this.getData().properties ? this.getData().properties.getAll().data.address : this.getData().address,
                        date = getDate(),
                        myPlacemark,
                        data;

                    data = {
                        coords: coords,
                        address: address,
                        name: name.value,
                        place: place.value,
                        date: date,
                        message: comment.value
                    };

                    balloons.push(data);
                    document.getElementById('form').reset();

                    if (reviews.firstElementChild) {
                        reviews.innerHTML += render(data);
                    } else {
                        reviews.innerHTML = render(data);
                    }

                    myPlacemark = this.createPlacemark.call(this, data);
                    clusterer.add(myPlacemark);
                    myMap.geoObjects.add(clusterer);
                } else {
                    alert('Заполните все поля!');
                }
            },
            createPlacemark(data) {
                return new ymaps.Placemark(data.coords, {
                    data: data
                }, {
                    preset: 'islands#violetIcon',
                    balloonLayout: balloonTpl,
                    balloonContentLayout: balloonContentTpl,
                    balloonPanelMaxMapArea: 0
                });
            }
        }
    );

    var balloonContentTpl = ymaps.templateLayoutFactory.createClass(
        `{% if properties.data %}
            <div class="desk-item">
                <div class="desk-item__name">{{properties.data.name}}</div>
                <div class="desk-item__place">{{properties.data.place}}</div>
                <div class="desk-item__date">{{properties.data.date}}</div>
                <div class="desk-item__message">{{properties.data.message}}</div>
            </div>
        {% else if %}
            {{message|raw}}
        {% endif %}`
    );

    var clustererTpl = ymaps.templateLayoutFactory.createClass(
        `<div class="cluster-map">
            <div class="cluster-map__top">
                <div class="cluster-map__place">{{properties.data.place}}</div>
                <a href="#" id="routeLink" class="cluster-map__link">{{properties.data.address}}</a>
                <div class="cluster-map__message">{{properties.data.message}}</div>
            </div>
            <div class="cluster-map__bottom">
                <div class="cluster-map__date">{{properties.data.date}}</div>
            </div>
        </div>`,
        {
            build() {
                this.constructor.superclass.build.call(this);
                var link = document.getElementById('routeLink');

                link.addEventListener('click', this.linkRoute.bind(this))
            },
            clear() {
                var link = document.getElementById('routeLink');

                link.removeEventListener('click', this.linkRoute);
                this.constructor.superclass.clear.call(this);
            },
            linkRoute(e) {
                e.preventDefault();

                var coords = this.getData().properties.getAll().data.coords,
                    source = document.getElementById("desksTpl").innerHTML,
                    render = Handlebars.compile(source),
                    points = [];

                points = balloons.filter((point) => {
                    return (coords[0] === point.coords[0] && coords[1] === point.coords[1])
                });

                myMap.balloon.open(coords, {
                    coords: coords,
                    address: points[0].address,
                    message: render({list: points})
                }, {
                    layout: balloonTpl,
                    contentLayout: balloonContentTpl
                });

                this.events.fire('userclose');
            }
        }
    );

    clusterer = new ymaps.Clusterer({
        preset: 'islands#invertedVioletClusterIcons',
        clusterDisableClickZoom: true,
        clusterHideIconOnBalloonOpen: false,
        clusterBalloonContentLayout: "cluster#balloonCarousel",
        clusterBalloonCycling: false,
        clusterOpenBalloonOnClick: true,
        clusterBalloonItemContentLayout: clustererTpl,
        clusterBalloonPanelMaxMapArea: 0
    });
}