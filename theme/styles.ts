import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  contentContainer: { padding: 16, paddingBottom: 150 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 150 },
  centered: { flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#2a2a2a', borderRadius: 20, padding: 16, marginBottom: 20 },

  // ログイン画面
  loginContainer: { flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', padding: 20 },
  loginBox: { width: '100%', backgroundColor: '#2a2a2a', padding: 30, borderRadius: 20, alignItems: 'center' },
  loginTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
  inputField: { width: '100%', height: 50, backgroundColor: '#111', borderRadius: 10, paddingHorizontal: 15, color: '#fff', marginBottom: 15 },
  loginButton: { width: '100%', height: 50, backgroundColor: '#2ecc71', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  loginButtonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  switchText: { color: '#2ecc71', fontSize: 14 },

  // ヘッダー関連
  homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  headerRowSimple: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#333' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  iconButton: { padding: 8 },

  // カレンダー
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, paddingHorizontal: 10 },
  monthText: { fontSize: 40, color: '#fff', fontWeight: '300' },
  yearText: { fontSize: 24, color: '#fff', fontWeight: '300' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  weekDayText: { color: '#888', width: 40, textAlign: 'center', fontSize: 12 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  dayCell: { width: '14%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  dayCircle: {
    width: 36,
    height: 36,
    minWidth: 36,
    minHeight: 36,
    maxWidth: 36,
    maxHeight: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDayCircle: { backgroundColor: '#2ecc71' },
  trainedDayCircle: { backgroundColor: '#fff' },
  dayText: { color: '#fff', fontSize: 16 },
  activeDayText: { color: '#fff', fontWeight: 'bold' },
  trainedDayText: { color: '#000', fontWeight: 'bold' },

  // Stats
  sectionTitle: { color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#444', paddingBottom: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calorieBox: { backgroundColor: '#2a2a2a', borderRadius: 15, width: '48%', height: 80, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  calorieLabel: { color: '#fff', fontSize: 12, marginRight: 10 },
  calorieValue: { color: '#2ecc71', fontSize: 14 },
  aiBox: { backgroundColor: '#e0e0e0', borderRadius: 15, width: '48%', height: 80 },

  // Training Screen & Modal
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 0,
    paddingTop: 10
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  categoryContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 15,
    marginBottom: 0,
  },

  // ★ tabScroll はここに1つだけ残す！
  tabScroll: { 
    paddingHorizontal: 16, 
    marginBottom: 10 
  },

  headerLabel: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'normal',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  homeWelcomeText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  routineSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  routineText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8
  },
  timerButton: { flexDirection: 'row', backgroundColor: '#2ecc71', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  timerText: { color: '#000', fontWeight: 'bold', marginLeft: 5 },

  exerciseCard: { backgroundColor: '#2a2a2a', borderRadius: 16, padding: 16, marginBottom: 16 },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  exerciseInfo: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  infoText: { color: '#888', fontSize: 12 },
  highlightText: { color: '#2ecc71' },

  setRowHeader: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4 },
  colLabel: { color: '#666', fontSize: 10, width: '25%', textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  setBadge: { width: '25%', alignItems: 'center' },
  setText: { color: '#888', fontSize: 14 },
  inputBox: {
    width: '22%',
    height: 44,
    backgroundColor: '#111',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: '1.5%',
  },
  inputValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  checkBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginLeft: 'auto', marginRight: 'auto' },
  checkedBtn: { backgroundColor: '#2ecc71' },

  addExerciseBtn: { backgroundColor: '#2ecc71', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 10, marginTop: 20 },
  addExerciseBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },

  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingTop: 32
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 16, 
    paddingHorizontal: 24,
    borderBottomWidth: 1, 
    borderColor: '#333' 
  },
  modalCategoryContainer: {
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  tabBtn: { paddingVertical: 8, paddingHorizontal: 16, marginRight: 10, borderRadius: 20, backgroundColor: '#333' },
  activeTabBtn: { backgroundColor: '#2ecc71' },
  tabText: { color: '#888' },
  activeTabText: { color: '#000', fontWeight: 'bold' },
  exerciseListItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#333' },
  exerciseListText: { color: '#fff', fontSize: 16 },

  tabBar: { backgroundColor: '#2a2a2a', borderTopWidth: 0, height: 60, paddingBottom: 10 },

  settingsItem: { paddingVertical: 10 },

  finishBtn: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 10,
    marginTop: 40,
    marginBottom: 20,
    alignItems: 'center',
  },
  finishBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  sectionHeader: {
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  sectionHeaderText: {
    color: '#2ecc71',
    fontWeight: 'bold',
    fontSize: 14,
  },

  inputFieldText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    width: '100%',
  },
  inputGhostLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGhostText: {
    color: '#fff',
    opacity: 0.28,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2ecc71',
    borderColor: '#2ecc71',
  },
  termsText: {
    color: '#ccc',
    fontSize: 14,
  },
  linkText: {
    color: '#2ecc71',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },

  addSetBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  addSetBtnText: {
    color: '#2ecc71',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },

  createRoutineBtn: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  createRoutineText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  routineItem: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routineNameText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  routineDescText: {
    color: '#888',
    fontSize: 12,
  },
});