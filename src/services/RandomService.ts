/**
 * 랜덤 배치 및 셔플 서비스
 */
import { Student } from '../models/Student.js';
import { Seat, SeatModel } from '../models/Seat.js';

/**
 * 랜덤 배치 관련 서비스
 */
export class RandomService {
    /**
     * 배열을 셔플합니다 (Fisher-Yates 알고리즘).
     * @param array 원본 배열
     * @returns 셔플된 배열 (새 배열, 원본은 변경되지 않음)
     */
    public static shuffle<T>(array: T[]): T[] {
        const shuffled = [...array];
        
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        return shuffled;
    }

    /**
     * 학생 배열을 랜덤하게 섞어서 반환합니다.
     * @param students 원본 학생 배열
     * @returns 셔플된 학생 배열
     */
    public static shuffleStudents(students: Student[]): Student[] {
        return this.shuffle(students);
    }

    /**
     * 좌석 배열을 랜덤하게 섞어서 반환합니다.
     * @param seats 원본 좌석 배열
     * @returns 셔플된 좌석 배열
     */
    public static shuffleSeats(seats: Seat[]): Seat[] {
        return this.shuffle(seats);
    }

    /**
     * 나머지 좌석에 학생들을 랜덤하게 배치합니다.
     * @param students 배치할 학생 배열
     * @param seats 좌석 배열
     * @returns 배치된 좌석 배열
     */
    public static assignRandomly(students: Student[], seats: Seat[]): Seat[] {
        // 사용 가능한 좌석만 필터링
        const availableSeats = SeatModel.getAvailableSeats(seats);
        
        // 학생과 좌석을 셔플
        const shuffledStudents = this.shuffleStudents(students);
        const shuffledSeats = this.shuffleSeats(availableSeats);
        
        // 짧은 배열의 길이만큼만 배치
        const minLength = Math.min(shuffledStudents.length, shuffledSeats.length);
        
        for (let i = 0; i < minLength; i++) {
            const seat = shuffledSeats[i];
            const student = shuffledStudents[i];
            
            if (seat && student) {
                SeatModel.assignStudent(seat, student.id, student.name);
            }
        }
        
        return seats;
    }

    /**
     * 남녀 짝꿍 배치를 수행합니다.
     * 남녀를 랜덤하게 짝을 맞춘 후 좌석에 배치합니다.
     * @param students 학생 배열
     * @param seats 좌석 배열
     * @param seatType 좌석 타입 (1열 또는 2열)
     * @returns 배치된 좌석 배열
     */
    public static assignGenderPairs(students: Student[], seats: Seat[], seatType: 'single' | 'pair'): Seat[] {
        const { male, female } = require('../models/Student').StudentModel.separateByGender(students);
        
        const shuffledMale = this.shuffleStudents(male);
        const shuffledFemale = this.shuffleStudents(female);
        
        // 남녀 짝꿍 생성
        const pairs: Array<{ male: Student, female: Student }> = [];
        const minLength = Math.min(shuffledMale.length, shuffledFemale.length);
        
        for (let i = 0; i < minLength; i++) {
            pairs.push({
                male: shuffledMale[i],
                female: shuffledFemale[i]
            });
        }
        
        // 짝꿍 목록을 랜덤하게 섞기
        const shuffledPairs = this.shuffle(pairs);
        
        // 2열 좌석 배치인 경우
        if (seatType === 'pair') {
            const availableSeats = SeatModel.getAvailableSeats(seats);
            let seatIndex = 0;
            
            for (const pair of shuffledPairs) {
                if (seatIndex >= availableSeats.length - 1) break;
                
                // 짝꿍 좌석에 배치
                const seat1 = availableSeats[seatIndex];
                const seat2 = availableSeats[seatIndex + 1];
                
                if (seat1 && seat2) {
                    SeatModel.assignStudent(seat1, pair.male.id, pair.male.name);
                    SeatModel.assignStudent(seat2, pair.female.id, pair.female.name);
                    seatIndex += 2;
                }
            }
            
            // 남은 학생들 배치
            const remainingMale = shuffledMale.slice(minLength);
            const remainingFemale = shuffledFemale.slice(minLength);
            const remainingStudents = [...remainingMale, ...remainingFemale];
            
            if (remainingStudents.length > 0 && seatIndex < availableSeats.length) {
                return this.assignRandomly(remainingStudents, seats);
            }
        }
        
        // 1열 좌석 배치인 경우
        return this.assignRandomly(students, seats);
    }

    /**
     * 고정 좌석이 있는 학생들을 먼저 배치하고,
     * 나머지 학생들을 랜덤하게 배치합니다.
     * @param students 학생 배열
     * @param seats 좌석 배열
     * @returns 배치된 좌석 배열
     */
    public static assignWithFixedSeats(students: Student[], seats: Seat[]): Seat[] {
        const { StudentModel } = require('../models/Student');
        
        // 고정 좌석이 있는 학생들을 먼저 배치
        const assignedStudents = StudentModel.getAssignedStudents(students);
        
        for (const student of assignedStudents) {
            const targetSeat = seats.find(seat => seat.id === student.fixedSeatId);
            
            if (targetSeat && SeatModel.isEmpty(targetSeat)) {
                SeatModel.assignStudent(targetSeat, student.id, student.name);
                targetSeat.isFixed = true;
            }
        }
        
        // 나머지 학생들을 랜덤하게 배치
        const unassignedStudents = StudentModel.getUnassignedStudents(students);
        return this.assignRandomly(unassignedStudents, seats);
    }

    /**
     * 좌석에 학생을 무작위로 재배치합니다.
     * @param seats 좌석 배열 (수정됨)
     */
    public static reshuffleAssignments(seats: Seat[]): void {
        // 모든 배정을 초기화
        for (const seat of seats) {
            SeatModel.removeStudent(seat);
        }
        
        // 사용 가능한 좌석 찾기
        const availableSeats = SeatModel.getAvailableSeats(seats);
        
        // ID만 추출하여 순서 섞기
        const shuffledIds = this.shuffle(availableSeats.map(s => s.id));
        
        // 좌석 ID를 섞어서 재배치
        for (let i = 0; i < shuffledIds.length; i++) {
            const seat = seats.find(s => s.id === shuffledIds[i]);
            if (seat && SeatModel.isEmpty(seat)) {
                // 원래 배정 정보를 재사용하되 순서만 변경
                const originalSeat = availableSeats[i];
                if (originalSeat && originalSeat.studentId) {
                    SeatModel.assignStudent(seat, originalSeat.studentId, originalSeat.studentName || '');
                }
            }
        }
    }
}

