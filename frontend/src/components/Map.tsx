import React, { ReactElement, useEffect } from 'react';
import { fromLonLat } from 'ol/proj';
import 'ol/ol.css';

import { RMap, ROSM, RLayerVector, RPopup, RFeature, RFeatureUIEvent, RStyle, ROverlay } from 'rlayers';
import { Icon, Style } from 'ol/style';
import { mapIcons } from '../mapIcons';
import { toLonLat } from 'ol/proj';
import GeoJSON from "ol/format/GeoJSON";
import { useLoginData, usePinMarkerRequest, usePostId, useSelectedTool, useShowLoginModal } from '../states';
import ToolbarComponent from './Tooolbar';
import { MapBrowserEvent } from 'ol';
import { NewPinModal } from './NewPinModal';
import { v4 as uuidv4 } from 'uuid';
import { useMapRefreshCount } from '../states';
import { getDistance } from 'ol/sphere';
import { Point } from 'ol/geom';

/** Main map */
export function Map(): ReactElement {
    // get latitude and longitude from the querystring
    let queryLatitude = parseFloat(new URLSearchParams(window.location.search).get('latitude') ?? '-30.0274557');
    let queryLongitude = parseFloat(new URLSearchParams(window.location.search).get('longitude') ?? '-51.2345937');
    if (isNaN(queryLatitude) || isNaN(queryLongitude)) {
        queryLatitude = -30.0274557;
        queryLongitude = -51.2345937;
    }


    const [latitude, setLatitude] = React.useState(queryLatitude);
    const { setPostId, postId } = usePostId();
    const [longitude, setLongitude] = React.useState(queryLongitude);
    const [zoom] = React.useState(14);
    const popup = React.useRef<RPopup>()
    const vectorLayerRef = React.useRef<RLayerVector>();
    const { selectedTool } = useSelectedTool();
    const { pinMarkerRequest, setPinMarkerRequest } = usePinMarkerRequest();
    const { refreshCount, setRefreshCount } = useMapRefreshCount();
    const [refreshTimoutCalled, setRefreshTimoutCalled] = React.useState(false);
    const [popupContent, setPopupContent] = React.useState<string | null>('');
    const [overlayLonLat, setOverlayLonLat] = React.useState<[number, number]>([0, 0]);
    const { loginData } = useLoginData()
    const { setShowLoginModal } = useShowLoginModal()

    useEffect(() => {

    }, [postId, refreshCount]);

    if (vectorLayerRef === undefined) return <div></div>
    if (popup === undefined) return <div></div>


    const handleFeatureClick = (e: RFeatureUIEvent) => {
        const feature = e.target;
        const geometry = feature?.getGeometry();
        if (feature === undefined) return;
        if (geometry === undefined) return;
        //const coordinates = e.map.getCoordinateFromPixel(e.pixel);

        e.map.getView().fit(geometry.getExtent(), {
            duration: 250,
            maxZoom: 15,
        });

        const postId = feature.get('postId');
        setPostId(postId);
    }

    const handlePinMarkerRequest = (e: MapBrowserEvent<UIEvent>) => {
        // Check if the user is logged in
        if (loginData === null) {
            setShowLoginModal(true);
            return;
        }

        const coordinates = toLonLat(
            e.map.getCoordinateFromPixel(e.pixel)
        )
        setPinMarkerRequest({
            latitude: coordinates[1],
            longitude: coordinates[0],
            uuid: uuidv4()
        });
    }

    return (
        <div>
            <NewPinModal />
            <ToolbarComponent />
            <RMap
                className='example-map'
                initial={{ center: fromLonLat([longitude, latitude]), zoom: zoom }}
                onClick={(e) => {
                    if (pinMarkerRequest === null && selectedTool === 'Pin') {
                        handlePinMarkerRequest(e);
                    }
                }}
                onMoveEnd={(e) => {
                    const map = e.map;
                    if (map === undefined) return;
                    const view = map.getView()
                    const center = view.getCenter();
                    if (center === undefined) return;
                    const zoom = view.getZoom();
                    const newCoordinates = toLonLat(center);

                    const lastCount = refreshCount;
                    const distance = getDistance(
                        [longitude, latitude],
                        newCoordinates
                    );
                    if (distance > 5000) {
                        setLatitude(newCoordinates[1]);
                        setLongitude(newCoordinates[0]);
                        setRefreshCount(lastCount + 1);
                    }

                    // Set latitude and longitude in the querystring without reloading the page
                    window.history.pushState({}, '', `?latitude=${newCoordinates[1]}&longitude=${newCoordinates[0]}`);

                }}
            >
                <ROSM />

                <RLayerVector
                    url={`/forum/topics/maps_data.json?latitude=${latitude}&longitude=${longitude}&zoom=${zoom}&refreshCount=${refreshCount}`}
                    format={new GeoJSON({ featureProjection: "EPSG:3857" })}
                    style={(feature) => {
                        const icon = mapIcons[feature.get('icon')];
                        function getRandomKey(obj: Record<string, any>): string {
                            const keys = Object.keys(obj);
                            return keys[Math.floor(Math.random() * keys.length)];
                        }
                        const randomIcon = mapIcons[getRandomKey(mapIcons)];
                        return new Style({
                            image: new Icon({
                                src: icon ?? randomIcon,
                                anchor: [0.5, 0.8],
                            }),
                        });
                    }}
                    onClick={(e) => {
                        if (e.target !== undefined && selectedTool === 'Mouse') {
                            handleFeatureClick(e);
                        }
                    }}
                    onPointerMove={(e) => {
                        const feature = e.map.forEachFeatureAtPixel(e.pixel, (feature) => feature);
                        if (feature) {
                            setPopupContent(feature.get('title'));
                            const lonLat = toLonLat(e.coordinate);
                            setOverlayLonLat([lonLat[0], lonLat[1]]);
                        } else {
                            setPopupContent(null);
                        }
                    }}

                >
                    <RFeature
                        geometry={new Point(fromLonLat(overlayLonLat))}
                    >
                        {popupContent && (
                            <ROverlay className="example-overlay">
                                {popupContent}
                            </ROverlay>)
                        }
                    </RFeature>
                </RLayerVector>
            </RMap>
        </div>
    );
}
