import React, { Component, PropTypes } from 'react';
import Nav from './common/Nav';
import SideNav from './common/SideNav';
import styles from './Channel.module.css';
import Track from './Track';
import SomaFMService from '../services/SomaFMService';

export default class Channel extends Component {

  static propTypes = {
    channels: PropTypes.shape({
      favorites: PropTypes.array.isRequired
    }).isRequired,
    location: PropTypes.shape({
      pathname: PropTypes.string.isRequired
    }).isRequired,
    match: PropTypes.shape({
      params: PropTypes.shape({ id: PropTypes.string.isRequired }).isRequired
    }).isRequired,
    player: PropTypes.shape({
      track: PropTypes.string,
      playlist: PropTypes.array,
      playing: PropTypes.bool.isRequired,
      metadata: PropTypes.shape({})
    }).isRequired,
    setMetadata: PropTypes.func.isRequired,
    setTrackUrl: PropTypes.func.isRequired,
    setFavorites: PropTypes.func.isRequired
  };

  static defaultProps = {
    player: {
      track: null,
      playlist: [],
      metadata: null
    }
  };

  constructor(props) {
    super(props);

    this.soma = new SomaFMService();

    this.state = {
      channelData: null,
      metadata: null,
      songs: [],
      channelSaved: false
    };

    this.timer = null;
    this.refreshInterval = 15000;
  }

  componentDidMount() {
    const channelId = this.props.match.params.id;
    this.getChannel(channelId);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.location.pathname !== nextProps.location.pathname) {
      const channelId = nextProps.match.params.id;
      this.getChannel(channelId);
    }
  }

  componentWillUnmount() {
    clearInterval(this.timer);
    this.timer = false;
  }

  getChannel(channelId) {
    const stationUrl = this.soma.getStationUrl(channelId);
    this.props.setTrackUrl(stationUrl, true);

    this.getChannelData(channelId);
    this.getSongsList(channelId);
    this.channelExists(channelId);
    this.loadFavorites();


    // Reset song list timer.
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.getSongsList(channelId);
    }, this.refreshInterval);
  }

  getChannelData(channelId) {
    this.soma.getChannel(channelId, (err, data) => {
      this.setState({ channelData: data });
      this.props.setMetadata({ data });
    });
  }

  channelExists(channelId) {
    SomaFMService.channelExists(channelId, (state) => {
      this.setState({ channelSaved: state });
    });
  }

  getSongsList(channelId) {
    this.soma.getSongsList(channelId, (err, data) => {
      this.setState({ songs: data });
    });
  }

  loadFavorites() {
    SomaFMService.loadSavedChannels((data) => {
      this.props.setFavorites(data);
    });
  }

  handlePlayPause = () => {
    this.props.setTrackUrl(this.props.player.track, !this.props.player.playing);
  }

  handleSaveChannel = () => {
    const { id: channelId, title } = this.state.channelData;
    if (this.state.channelSaved) {
      SomaFMService.removeChannel(channelId, () => {
        this.setState({ channelSaved: false });
        this.loadFavorites();
      });
    } else {
      const channel = {
        id: channelId,
        title
      };

      SomaFMService.saveChannel(channel, () => {
        this.setState({ channelSaved: true });
        this.loadFavorites();
      });
    }
  }

  render() {
    const channelData = this.state.channelData;
    const currentSong = this.state.songs.length > 0 ? this.state.songs[0].title : null;

    const songNodes = this.state.songs && this.state.songs.map((v) => (
      <Track
        key={v.title}
        title={v.title}
        artist={v.artist}
        album={v.album}
        date={v.date}
      />
    ));

    return (
      <div className={styles.channel} data-tid="channel">
        <SideNav favorites={this.props.channels.favorites} />
        <div className={styles.container}>
          <Nav />
          <div className={styles.cover}>
            <img
              src={channelData && channelData.largeimage}
              alt={channelData && channelData.title}
            />
            <h2>{(channelData && channelData.title) || 'Loading channel...'}</h2>
            <h4>{channelData && channelData.description}</h4>
            <h5>DJ: {channelData && channelData.dj}</h5>
            {/* <h4>Now Playing: {channelData && channelData.lastPlaying}</h4> */}
            <h4>Now Playing: {currentSong}</h4>

            <div className={styles.buttons}>
              <button className={styles.button} onClick={this.handlePlayPause}>
                <i className={!this.props.player.playing ? 'fa fa-play' : 'fa fa-pause'} />&nbsp;
                { !this.props.player.playing ? 'Play' : 'Pause' }
              </button>
              <button className={styles.button} onClick={this.handleSaveChannel}>
                <i className={this.state.channelSaved ? 'fa fa-star' : 'fa fa-star-o'} />&nbsp;
                { !this.state.channelSaved ? 'Favorite' : 'Remove' }
              </button>
            </div>
          </div>

          <h3 className={styles.recent}>Recently Played Songs</h3>
          <div className={styles.songsHeader}>
            <div className={styles.date}>Played at</div>
            <div className={styles.artist}>Artist</div>
            <div className={styles.title}>Song</div>
            <div className={styles.album}>Album</div>
          </div>
          <div className={styles.songs}>
            {songNodes}
          </div>
        </div>
      </div>
    );
  }
}
