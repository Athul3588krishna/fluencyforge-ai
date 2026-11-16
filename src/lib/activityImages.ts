import heroStudyWorkspace from '../assets/images/hero_study_workspace_1794794633101.jpg';
import marketScene from '../assets/images/picture_market_scene_1794794631293.jpg';
import officeMeeting from '../assets/images/picture_office_meeting_1794794630987.jpg';
import trainStation from '../assets/images/picture_train_station_1794794632097.jpg';

export const HERO_WORKSPACE_IMAGE = heroStudyWorkspace;

export const PICTURE_SCENE_IMAGES: Record<'market' | 'office' | 'station', string> = {
  market: marketScene,
  office: officeMeeting,
  station: trainStation,
};
