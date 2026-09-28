use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioSettings {
    pub device_name: Option<String>,
    pub mic_gain: f32,         // 0.0 to 2.5
    pub is_muted: bool,
    pub reverb_preset: String,   // "dry", "room", "hall"
    pub reverb_mix: f32,       // 0.0 to 1.0
    pub echo_percent: f32,     // 0.0 to 100.0
    pub tone_db: f32,          // -6.0 to 6.0
}

impl Default for AudioSettings {
    fn default() -> Self {
        Self {
            device_name: None,
            mic_gain: 1.0,
            is_muted: false,
            reverb_preset: "room".to_string(),
            reverb_mix: 0.35,
            echo_percent: 20.0,
            tone_db: 0.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioStatus {
    pub is_active: bool,
    pub sample_rate: u32,
    pub current_level_db: f32,
}
