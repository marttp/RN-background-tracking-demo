import React, { Component } from 'react'
import { Platform, StyleSheet, Dimensions, Text, View, Alert, Button } from 'react-native'
import MapView, { Polyline } from 'react-native-maps'
import BackgroundGeolocation from 'react-native-mauron85-background-geolocation'

const { width, height } = Dimensions.get('window')
const SC_HEIGHT = height
const SC_WIDTH = width

const ASPECT_RATIO = SC_WIDTH / SC_HEIGHT
const LATTITUDE_DELTA = 0.01
const LONGTITUDE_DELTA = LATTITUDE_DELTA * ASPECT_RATIO

export default class App extends Component {
  state = {
    initialPosition: {
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0,
      longitudeDelta: 0,
    },
    location: null,
    historyLocations: [],
    stationaries: [],
    isRunning: false,
  }

  componentDidMount() {
    /**
     * 1. First time you run it. It will popup for request location permission. And then reload application
     * 2. Implement Background geolocation process for make tracking your route
     * 3. Press start and move your position for making change
     * 4. Just a demo project. You can fix with your own style.
     **/

    /**
     * It's configure object visit: https://github.com/mauron85/react-native-background-geolocation
     */
    BackgroundGeolocation.configure({
      desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY,
      stationaryRadius: 10,
      distanceFilter: 10,
      notificationTitle: 'Background tracking',
      notificationText: 'enabled',
      startOnBoot: false,
      stopOnTerminate: true,
      locationProvider: BackgroundGeolocation.ACTIVITY_PROVIDER,
      interval: 5000,
      fastestInterval: 3000,
      activitiesInterval: 5000,
      stopOnStillActivity: false,
    })

    BackgroundGeolocation.getCurrentLocation(
      lastLocation => {
        const initialPosition = {
          latitude: lastLocation.latitude,
          longitude: lastLocation.longitude,
          latitudeDelta: LATTITUDE_DELTA,
          longitudeDelta: LONGTITUDE_DELTA,
        }
        this.setState({ initialPosition: initialPosition, location: lastLocation })
      },
      error => {
        setTimeout(() => {
          Alert.alert('Error obtaining current location', JSON.stringify(error))
        }, 100)
      }
    )

    BackgroundGeolocation.on('start', () => {
      console.log('[DEBUG] BackgroundGeolocation has been started')
      this.setState({ isRunning: true })
    })

    BackgroundGeolocation.on('stop', () => {
      console.log('[DEBUG] BackgroundGeolocation has been stopped')
      this.setState({ isRunning: false })
    })

    BackgroundGeolocation.on('error', ({ message }) => {
      Alert.alert('BackgroundGeolocation error', message)
    })

    BackgroundGeolocation.on('authorization', status => {
      console.log('[INFO] BackgroundGeolocation authorization status: ' + status)
      if (status !== BackgroundGeolocation.AUTHORIZED) {
        setTimeout(
          () =>
            Alert.alert('App requires location tracking', 'Would you like to open app settings?', [
              {
                text: 'Yes',
                onPress: () => BackgroundGeolocation.showAppSettings(),
              },
              {
                text: 'No',
                onPress: () => console.log('No Pressed'),
                style: 'cancel',
              },
            ]),
          1000
        )
      }
    })

    /**
     * Main process at this function
     * It work by your configure interval time
     */
    BackgroundGeolocation.on('location', location => {
      // ! Active when you press the button
      console.log('[DEBUG] BackgroundGeolocation location', location)
      BackgroundGeolocation.startTask(taskKey => {
        requestAnimationFrame(() => {
          const region = Object.assign({}, location, {
            latitudeDelta: LATTITUDE_DELTA,
            longitudeDelta: LONGTITUDE_DELTA,
          })

          const locations = this.state.historyLocations
          const newLocation = {
            latitude: location.latitude,
            longitude: location.longitude,
          }

          // ! make object and push it to history data prepare for Polyline
          locations.push(newLocation)

          this.setState({ historyLocations: locations, location: region }, () => {
            console.log({
              location: this.state.location,
              historyLocations: this.state.historyLocations,
            })
          })

          BackgroundGeolocation.endTask(taskKey)
        })
      })
    })

    BackgroundGeolocation.on('foreground', () => {
      console.log('[INFO] App is in foreground')
    })

    BackgroundGeolocation.on('background', () => {
      console.log('[INFO] App is in background')
    })

    BackgroundGeolocation.checkStatus(({ isRunning }) => {
      this.setState({ isRunning })
    })
  }

  componentWillUnmount() {
    // ! Unregister all event listeners
    BackgroundGeolocation.events.forEach(event => BackgroundGeolocation.removeAllListeners(event))
  }

  startTracking = () => {
    BackgroundGeolocation.checkStatus(({ isRunning, locationServicesEnabled, authorization }) => {
      if (isRunning) {
        BackgroundGeolocation.stop()
        return false
      }

      if (!locationServicesEnabled) {
        Alert.alert('Location services disabled', 'Would you like to open location settings?', [
          {
            text: 'Yes',
            onPress: () => BackgroundGeolocation.showLocationSettings(),
          },
          {
            text: 'No',
            onPress: () => console.log('No Pressed'),
            style: 'cancel',
          },
        ])
        return false
      }

      if (authorization == 99) {
        BackgroundGeolocation.start()
      } else if (authorization == BackgroundGeolocation.AUTHORIZED) {
        BackgroundGeolocation.start()
      } else {
        Alert.alert('App requires location tracking', 'Please grant permission', [
          {
            text: 'Ok',
            onPress: () => BackgroundGeolocation.start(),
          },
        ])
      }
    })
  }

  render() {
    return (
      <View style={styles.containerMap}>
        <MapView
          provider="google"
          style={styles.map}
          ref={ref => {
            this.map = ref
          }}
          showsMyLocationButton
          showsUserLocation
          showsCompass
          region={this.state.initialPosition}>
          <Polyline
            coordinates={this.state.historyLocations.map(marker => {
              return {
                latitude: marker.latitude,
                longitude: marker.longitude,
              }
            })}
            strokeWidth={5}
            strokeColor={'#000000'}
          />
        </MapView>
        <Button title="Start" onPress={() => this.startTracking()} />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  containerMap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
})
