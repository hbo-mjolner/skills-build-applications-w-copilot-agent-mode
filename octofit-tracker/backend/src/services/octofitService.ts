import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const invalidInput = () => Object.assign(new Error('Invalid activity input'), { status: 400 });
  if (!input || typeof input !== 'object') throw invalidInput();

  const activity = input as Record<string, unknown>;
  const { userId, teamId, type, minutes } = activity;
  if (
    typeof userId !== 'string' || !Types.ObjectId.isValid(userId) ||
    typeof teamId !== 'string' || !Types.ObjectId.isValid(teamId) ||
    typeof type !== 'string' || !type.trim() ||
    typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0
  ) {
    throw invalidInput();
  }

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) throw invalidInput();

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const invalidInput = () => Object.assign(new Error('Invalid team input'), { status: 400 });
  if (!input || typeof input !== 'object') throw invalidInput();

  const teamInput = input as Record<string, unknown>;
  const { name, mascot, members = [] } = teamInput;
  if (
    typeof name !== 'string' || !name.trim() ||
    typeof mascot !== 'string' || !mascot.trim() ||
    !Array.isArray(members) ||
    !members.every((member) => typeof member === 'string' && Types.ObjectId.isValid(member))
  ) {
    throw invalidInput();
  }

  const existingMembers = await User.find({ _id: { $in: members } }).select('_id team').lean();
  if (existingMembers.length !== members.length) throw invalidInput();
  if (existingMembers.some((member) => member.team) || await Team.exists({ members: { $in: members } })) {
    throw invalidInput();
  }

  const team = await Team.create({ name: name.trim(), mascot: mascot.trim(), members });
  await User.updateMany({ _id: { $in: members } }, { $set: { team: team._id } });
  return team;
}

export async function getLeaderboard() {
  const [activities, teams] = await Promise.all([
    Activity.find().select('team points').lean(),
    Team.find().select('name').lean(),
  ]);
  const teamNames = new Map(teams.map((team) => [team._id.toString(), team.name]));
  const pointsByTeam = new Map<string, number>();

  for (const activity of activities) {
    const teamId = activity.team.toString();
    pointsByTeam.set(teamId, (pointsByTeam.get(teamId) ?? 0) + activity.points);
  }

  return [...pointsByTeam.entries()]
    .map(([teamId, totalPoints]) => ({ teamName: teamNames.get(teamId), totalPoints }))
    .filter((entry): entry is { teamName: string; totalPoints: number } => entry.teamName !== undefined)
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const [activity, workouts] = await Promise.all([
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
    Workout.find({ focus: user.fitnessGoal }).lean(),
  ]);
  const activityPattern = activity?.type ?? user.fitnessGoal;

  return workouts.map((workout) => ({
    ...workout,
    reason: `Recommended based on your ${activityPattern} activity and ${user.fitnessGoal} goal.`,
  }));
}

export { User };
