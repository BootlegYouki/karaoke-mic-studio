pub mod dsp;
pub mod stream;
pub mod types;

pub use stream::AudioController;
pub use types::{AudioSettings, AudioStatus};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_controller_initial_state() {
        let controller = AudioController::new();
        assert!(!controller.is_active());
        assert_eq!(controller.get_level_db(), -60.0);
        let status = controller.get_status();
        assert!(!status.is_active);
    }

    #[test]
    fn test_audio_settings_default() {
        let settings = AudioSettings::default();
        assert_eq!(settings.mic_gain, 1.0);
        assert!(!settings.is_muted);
        assert_eq!(settings.reverb_preset, "room");
    }
}
